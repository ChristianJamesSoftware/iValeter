import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Role } from "@ivaleter/db";
import { router, protectedProcedure, orgAdminProcedure } from "../trpc";
import { hashPassword } from "../auth";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function generatePayId(firstName: string, lastName: string): string {
  const f = firstName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
  const l = lastName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
  return `${f}.${l}`;
}

export const usersRouter = router({
  /** List valeters in the org, optionally filtered by site, with today's job counts. */
  listValeters: protectedProcedure
    .input(z.object({ siteId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const valeters = await ctx.prisma.user.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          role: Role.valeter,
          ...(input?.siteId ? { siteId: input.siteId } : {}),
        },
        include: { site: { select: { id: true, name: true } } },
        orderBy: { firstName: "asc" },
      });

      const today = startOfToday();
      const counts = await ctx.prisma.booking.groupBy({
        by: ["assignedToId"],
        where: {
          organisationId: ctx.session.organisationId,
          assignedToId: { in: valeters.map((v) => v.id) },
          readyByTime: { gte: today },
        },
        _count: { _all: true },
      });
      const countMap = new Map(
        counts.map((c) => [c.assignedToId, c._count._all]),
      );

      return valeters.map((v) => ({
        id: v.id,
        firstName: v.firstName,
        lastName: v.lastName,
        email: v.email,
        siteId: v.siteId,
        siteName: v.site?.name ?? null,
        skills: v.skills,
        isActive: v.isActive,
        mobile: v.mobile,
        payId: v.payId,
        dailyRate: v.dailyRate,
        dailyDeductions: v.dailyDeductions,
        startDate: v.startDate,
        contractComplete: v.contractComplete,
        jobsToday: countMap.get(v.id) ?? 0,
      }));
    }),

  list: orgAdminProcedure
    .input(z.object({ role: z.nativeEnum(Role).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return ctx.prisma.user.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          ...(input?.role ? { role: input.role } : {}),
        },
        include: { site: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: orgAdminProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        password: z.string().min(6),
        role: z.nativeEnum(Role),
        siteId: z.string().optional(),
        skills: z.array(z.string()).default([]),
        mobile: z.string().optional(),
        payId: z.string().optional(),
        dailyRate: z.number().optional(),
        dailyDeductions: z.number().optional(),
        startDate: z.string().optional(),
        contractComplete: z.boolean().optional(),
        jobTitle: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.user.findUnique({
        where: { email: input.email.toLowerCase().trim() },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this email already exists",
        });
      }

      if (input.siteId) {
        const site = await ctx.prisma.site.findFirst({
          where: {
            id: input.siteId,
            organisationId: ctx.session.organisationId,
          },
        });
        if (!site) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
        }
      }

      return ctx.prisma.user.create({
        data: {
          organisationId: ctx.session.organisationId,
          email: input.email.toLowerCase().trim(),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          passwordHash: hashPassword(input.password),
          role: input.role,
          siteId: input.siteId ?? null,
          skills: input.skills,
          mobile: input.mobile ?? null,
          payId:
            input.payId?.trim() ||
            generatePayId(input.firstName, input.lastName),
          dailyRate: input.dailyRate ?? null,
          dailyDeductions: input.dailyDeductions ?? null,
          startDate: input.startDate ? new Date(input.startDate) : null,
          contractComplete: input.contractComplete ?? false,
          jobTitle: input.jobTitle ?? null,
        },
      });
    }),

  update: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        siteId: z.string().nullable().optional(),
        skills: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
        mobile: z.string().optional(),
        payId: z.string().optional(),
        dailyRate: z.number().optional(),
        dailyDeductions: z.number().optional(),
        startDate: z.string().optional(),
        contractComplete: z.boolean().optional(),
        jobTitle: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const { id, startDate, ...rest } = input;
      return ctx.prisma.user.update({
        where: { id },
        data: {
          ...rest,
          ...(startDate !== undefined
            ? { startDate: startDate ? new Date(startDate) : null }
            : {}),
        },
      });
    }),,
  /**
   * Returns today's clock-in status for each valeter at a site.
   * Used by Ops Centre to show green/red status and flag late arrivals.
   */
  clockStatusToday: orgAdminProcedure
    .input(z.object({ siteId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const today = startOfToday();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // All active valeters for the org (optionally filtered by site)
      const valeters = await ctx.prisma.user.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          role: Role.valeter,
          isActive: true,
          ...(input.siteId ? { siteId: input.siteId } : {}),
        },
        select: { id: true, firstName: true, lastName: true, siteId: true },
      });

      // All clock events for these valeters today
      const events = await ctx.prisma.clockEvent.findMany({
        where: {
          userId: { in: valeters.map((v) => v.id) },
          timestamp: { gte: today, lt: tomorrow },
        },
        orderBy: { timestamp: "asc" },
      });

      // Build a map: userId -> earliest CLOCK_IN today
      const clockInMap = new Map<string, Date>();
      for (const e of events) {
        if (e.type === "CLOCK_IN" && !clockInMap.has(e.userId)) {
          clockInMap.set(e.userId, e.timestamp);
        }
      }

      // 8:15 AM threshold
      const cutoff = new Date(today);
      cutoff.setHours(8, 15, 0, 0);
      const now = new Date();

      return valeters.map((v) => {
        const clockedInAt = clockInMap.get(v.id) ?? null;
        const isClockedIn = clockedInAt !== null;
        const isLate = !isClockedIn && now > cutoff; // past 8:15 and still not in

        return {
          id: v.id,
          firstName: v.firstName,
          lastName: v.lastName,
          siteId: v.siteId,
          isClockedIn,
          clockedInAt,
          isLate, // needs flagging red + alert
        };
      });
    }),
});
