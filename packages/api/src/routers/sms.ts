import { z } from "zod";
import { router, orgAdminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const SMSWORKS_BASE = "https://api.thesmsworks.co.uk/v1";
const SENDER = "TotValeting";

// ─── JWT cache (in-memory, valid ~25 years per their token) ─────────────────
let cachedJwt: string | null = null;

async function getSmsWorksJwt(): Promise<string> {
  if (cachedJwt) return cachedJwt;

  const key    = process.env.SMSWORKS_KEY;
  const secret = process.env.SMSWORKS_SECRET;

  if (!key || !secret) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "SMS service is not configured. Please contact support.",
    });
  }

  const res = await fetch(`${SMSWORKS_BASE}/auth/token`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ customerid: key, key, secret }),
  });

  if (!res.ok) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `SMS auth failed: ${res.status}`,
    });
  }

  const data = await res.json() as { token: string };
  cachedJwt = data.token;
  return cachedJwt;
}

async function smsWorksPost(path: string, body: unknown): Promise<unknown> {
  const jwt = await getSmsWorksJwt();
  const res = await fetch(`${SMSWORKS_BASE}${path}`, {
    method:  "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": jwt,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }

  if (!res.ok) {
    // Invalidate JWT on auth failure so next call re-authenticates
    if (res.status === 401) cachedJwt = null;
    const msg = (json as Record<string, string>)?.message ?? text;
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `SMS error: ${msg}` });
  }

  return json;
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const smsRouter = router({

  /** Check remaining SMS credit balance */
  balance: orgAdminProcedure
    .query(async () => {
      const jwt = await getSmsWorksJwt();
      const res = await fetch(`${SMSWORKS_BASE}/credits/balance`, {
        headers: { "Authorization": jwt },
      });
      if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not fetch SMS balance" });
      return res.json() as Promise<{ credits: number }>;
    }),

  /**
   * Send a single SMS to one recipient.
   * destination must be in international format: 447700900000
   */
  sendOne: orgAdminProcedure
    .input(z.object({
      destination: z.string().min(10),
      content:     z.string().min(1).max(612), // 4 SMS parts max
    }))
    .mutation(async ({ input }) => {
      return smsWorksPost("/message/send", {
        sender:      SENDER,
        destination: input.destination.replace(/\D/g, "").replace(/^0/, "44"),
        content:     input.content,
      });
    }),

  /**
   * Broadcast to a list of valeters by their userId.
   * Looks up mobile numbers, strips non-digits, converts to 44xxxxxxxxxx,
   * sends via /batch/any (one API call, individual delivery tracking).
   */
  broadcast: orgAdminProcedure
    .input(z.object({
      message:    z.string().min(1).max(612),
      valeterIds: z.array(z.string()).min(1).max(200),
      // Optional: schedule for later (ISO datetime string)
      scheduleAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Fetch mobile numbers for selected valeters in this org
      const valeters = await ctx.prisma.user.findMany({
        where: {
          id:             { in: input.valeterIds },
          organisationId: ctx.session.organisationId,
          role:           "valeter",
          isActive:       true,
        },
        select: { id: true, firstName: true, lastName: true, mobile: true },
      });

      const withMobile = valeters.filter((v) => v.mobile?.trim());
      const skipped    = valeters.filter((v) => !v.mobile?.trim());

      if (withMobile.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "None of the selected valeters have a mobile number on record.",
        });
      }

      // Build batch messages array
      const messages = withMobile.map((v) => ({
        sender:      SENDER,
        destination: v.mobile!.replace(/\D/g, "").replace(/^0/, "44"),
        content:     input.message,
        ...(input.scheduleAt ? { schedule: input.scheduleAt } : {}),
      }));

      const result = await smsWorksPost("/batch/any", { messages }) as {
        batchid: string;
        status:  string;
      };

      return {
        batchId:      result.batchid,
        sent:         withMobile.length,
        skippedCount: skipped.length,
        skipped:      skipped.map((v) => `${v.firstName} ${v.lastName}`),
      };
    }),

  /**
   * Broadcast to ALL active valeters in the org (no selection needed).
   */
  broadcastAll: orgAdminProcedure
    .input(z.object({
      message:    z.string().min(1).max(612),
      scheduleAt: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const valeters = await ctx.prisma.user.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          role:           "valeter",
          isActive:       true,
        },
        select: { id: true, firstName: true, lastName: true, mobile: true },
      });

      const withMobile = valeters.filter((v) => v.mobile?.trim());
      const skipped    = valeters.filter((v) => !v.mobile?.trim());

      if (withMobile.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No active valeters have mobile numbers on record.",
        });
      }

      const messages = withMobile.map((v) => ({
        sender:      SENDER,
        destination: v.mobile!.replace(/\D/g, "").replace(/^0/, "44"),
        content:     input.message,
        ...(input.scheduleAt ? { schedule: input.scheduleAt } : {}),
      }));

      const result = await smsWorksPost("/batch/any", { messages }) as {
        batchid: string;
        status:  string;
      };

      return {
        batchId:      result.batchid,
        sent:         withMobile.length,
        skippedCount: skipped.length,
        skipped:      skipped.map((v) => `${v.firstName} ${v.lastName}`),
      };
    }),
});
