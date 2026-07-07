import { z } from "zod";
import { router, orgAdminProcedure, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { prisma as _prismaRef } from "@ivaleter/db";

type PrismaInstance = typeof _prismaRef;

/** Return the Monday of the ISO week that contains `date`. */
function isoWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

// ─── Nominal code → ServiceChargeType mapping ────────────────────────────────
// Account codes seeded in DB:
//   200 = Valeter Sales Days, 201 = Insurance Excess, 202 = Paint Protection
//   203 = CSI Add-Ons, 312 = Consumables, 321 = Subcontractor, 323 = Work Clothes

const CODE_TO_TYPE: Record<string, "PAINT_PROTECTION" | "CSI_ADDON" | "WORK_CLOTHES" | "SUBCONTRACTOR" | "OTHER"> = {
  "202": "PAINT_PROTECTION",
  "203": "CSI_ADDON",
  "323": "WORK_CLOTHES",
  "321": "SUBCONTRACTOR",
};

export const serviceChargesRouter = router({
  // ─── HQ: list all pending service charge requests ─────────────────────────

  listPending: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.serviceChargeRequest.findMany({
      where: {
        organisationId: ctx.session.organisationId,
        status: "PENDING",
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            site: { select: { name: true } },
          },
        },
        booking: {
          select: {
            id: true,
            vehicleReg: true,
            vehicleMake: true,
            vehicleModel: true,
            customerName: true,
          },
        },
        site: { select: { id: true, name: true } },
        xeroNominalCode: { select: { id: true, name: true, xeroAccountCode: true } },
      },
    });
  }),

  // ─── HQ: list all (any status) for a date range ──────────────────────────

  listAll: orgAdminProcedure
    .input(
      z.object({
        weekStarting: z.string().optional(), // ISO date string
      }),
    )
    .query(async ({ ctx, input }) => {
      const weekFilter = input.weekStarting ? new Date(input.weekStarting) : undefined;
      return ctx.prisma.serviceChargeRequest.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          ...(weekFilter ? { weekStarting: weekFilter } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              site: { select: { name: true } },
            },
          },
          booking: {
            select: {
              id: true,
              vehicleReg: true,
              vehicleMake: true,
              vehicleModel: true,
              customerName: true,
            },
          },
          site: { select: { id: true, name: true } },
          xeroNominalCode: { select: { id: true, name: true, xeroAccountCode: true } },
        },
      });
    }),

  // ─── HQ: approve a service charge request ────────────────────────────────
  // On approval:
  //   1. Find-or-create the valeter's Timesheet for the charge's week
  //   2. Write a TimesheetExtraLine (isRecurring=false) with the charge amount
  //   3. Mark the request APPROVED and set timesheetExtraLineId

  approve: orgAdminProcedure
    .input(
      z.object({
        requestId: z.string(),
        reviewNote: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.serviceChargeRequest.findFirst({
        where: {
          id: input.requestId,
          organisationId: ctx.session.organisationId,
          status: "PENDING",
        },
        include: {
          user: { select: { siteId: true, firstName: true, lastName: true } },
          xeroNominalCode: true,
        },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Service charge request not found or already reviewed" });

      const weekStart = isoWeekStart(req.weekStarting);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const siteId = req.siteId ?? req.user.siteId;
      if (!siteId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Valeter has no site — cannot write to timesheet" });
      }

      // Find or create the timesheet for that week
      let timesheet = await ctx.prisma.timesheet.findUnique({
        where: { userId_weekStarting: { userId: req.userId, weekStarting: weekStart } },
      });

      if (!timesheet) {
        timesheet = await ctx.prisma.timesheet.create({
          data: {
            userId: req.userId,
            siteId,
            weekStarting: weekStart,
            weekEnding: weekEnd,
            status: "DRAFT",
          },
        });
      }

      // Write the extra line
      const extraLine = await ctx.prisma.timesheetExtraLine.create({
        data: {
          timesheetId: timesheet.id,
          description: req.description,
          ratePence: req.amountPence,
          isRecurring: false, // one-off service charge
        },
      });

      // Mark request approved
      return ctx.prisma.serviceChargeRequest.update({
        where: { id: req.id },
        data: {
          status: "APPROVED",
          reviewedByUserId: ctx.session.userId,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote ?? null,
          timesheetExtraLineId: extraLine.id,
        },
      });
    }),

  // ─── HQ: reject a service charge request ─────────────────────────────────

  reject: orgAdminProcedure
    .input(
      z.object({
        requestId: z.string(),
        reviewNote: z.string().min(3, "Please give a reason"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.serviceChargeRequest.findFirst({
        where: {
          id: input.requestId,
          organisationId: ctx.session.organisationId,
          status: "PENDING",
        },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Service charge request not found or already reviewed" });

      return ctx.prisma.serviceChargeRequest.update({
        where: { id: req.id },
        data: {
          status: "REJECTED",
          reviewedByUserId: ctx.session.userId,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote,
        },
      });
    }),

  // ─── HQ/SA: manually raise a service charge ──────────────────────────────

  create: orgAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        bookingId: z.string().optional(),
        siteId: z.string().optional(),
        type: z.enum(["PAINT_PROTECTION", "CSI_ADDON", "WORK_CLOTHES", "SUBCONTRACTOR", "OTHER"]),
        description: z.string().min(3),
        amountPence: z.number().int().positive(),
        weekStarting: z.string(), // ISO date — will be floored to Monday
        xeroNominalCodeId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const weekStart = isoWeekStart(new Date(input.weekStarting));
      return ctx.prisma.serviceChargeRequest.create({
        data: {
          organisationId: ctx.session.organisationId,
          userId: input.userId,
          bookingId: input.bookingId ?? null,
          siteId: input.siteId ?? null,
          type: input.type,
          description: input.description,
          amountPence: input.amountPence,
          weekStarting: weekStart,
          status: "PENDING",
          xeroNominalCodeId: input.xeroNominalCodeId ?? null,
        },
      });
    }),

  // ─── Internal: auto-create from booking (called by bookings router) ───────
  // Not exposed as a public procedure — invoked directly via ctx.prisma inside
  // the bookings updateStatus mutation when status → COMPLETED.
  // Exported as a plain function for use in bookings.ts

} );

/**
 * Called from the bookings router when a job is marked COMPLETED.
 * Creates ServiceChargeRequest rows for any chargeable add-ons on the booking.
 */
export async function autoCreateServiceCharges(
  prisma: PrismaInstance,
  booking: {
    id: string;
    organisationId: string;
    siteId: string | null;
    assignedToId: string | null;
    createdById: string;
    paintProtectionProductId: string | null;
    includeFreshScent: boolean;
    weekStarting?: Date; // if provided, use this; otherwise calc from now
    paintProtectionProduct?: { priceGbp: number } | null;
  },
) {
  const charges: Array<{
    type: "PAINT_PROTECTION" | "CSI_ADDON" | "WORK_CLOTHES" | "SUBCONTRACTOR" | "OTHER";
    description: string;
    amountPence: number;
    nominalCode: string;
  }> = [];

  // Paint Protection
  if (booking.paintProtectionProductId) {
    let priceGbp = booking.paintProtectionProduct?.priceGbp ?? 0;
    if (!priceGbp) {
      const product = await prisma.paintProtectionProduct.findUnique({
        where: { id: booking.paintProtectionProductId },
        select: { priceGbp: true, name: true },
      });
      priceGbp = product?.priceGbp ?? 0;
    }
    if (priceGbp > 0) {
      charges.push({
        type: "PAINT_PROTECTION",
        description: `Paint Protection — Booking ${booking.id}`,
        amountPence: Math.round(priceGbp * 100),
        nominalCode: "202",
      });
    }
  }

  // CSI Fresh Scent add-on
  if (booking.includeFreshScent) {
    // Fresh Scent is a CSI add-on with a nominal fixed price.
    // Amount is 0 here — SA can set on approval or we leave it as £0 pending.
    charges.push({
      type: "CSI_ADDON",
      description: `CSI Fresh Scent Add-On — Booking ${booking.id}`,
      amountPence: 0, // SA reviews and sets amount on approval
      nominalCode: "203",
    });
  }

  if (charges.length === 0) return;

  const valeterUserId = booking.assignedToId ?? booking.createdById;
  const weekStart = booking.weekStarting ?? (() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const w = new Date(now);
    w.setDate(now.getDate() + diff);
    w.setHours(0, 0, 0, 0);
    return w;
  })();

  // Resolve nominal code IDs once
  const allNominalCodes = await prisma.xeroExpenseNominalCode.findMany({
    where: { organisationId: booking.organisationId },
    select: { id: true, xeroAccountCode: true },
  });
  const codeMap = new Map(allNominalCodes.map((c) => [c.xeroAccountCode, c.id]));

  type ChargeItem = { type: "PAINT_PROTECTION" | "CSI_ADDON" | "WORK_CLOTHES" | "SUBCONTRACTOR" | "OTHER"; description: string; amountPence: number; nominalCode: string };
  await prisma.serviceChargeRequest.createMany({
    data: (charges as ChargeItem[]).map((c) => ({
      id: `scr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      organisationId: booking.organisationId,
      bookingId: booking.id,
      userId: valeterUserId,
      siteId: booking.siteId ?? null,
      type: c.type,
      description: c.description,
      amountPence: c.amountPence,
      weekStarting: weekStart,
      status: "PENDING" as const,
      xeroNominalCodeId: codeMap.get(c.nominalCode) ?? null,
      updatedAt: new Date(),
    })),
    skipDuplicates: true,
  });
}
