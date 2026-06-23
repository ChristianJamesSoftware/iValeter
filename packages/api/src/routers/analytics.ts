import { z } from "zod";
import { BookingStatus, type Prisma } from "@ivaleter/db";
import { router, protectedProcedure } from "../trpc";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function baseScope(session: {
  organisationId: string;
  role: string;
  siteId: string | null;
}): Prisma.BookingWhereInput {
  const where: Prisma.BookingWhereInput = {
    organisationId: session.organisationId,
  };
  if (session.role === "dealership_user" && session.siteId) {
    where.siteId = session.siteId;
  }
  return where;
}

export const analyticsRouter = router({
  /** Headline stat cards used on every dashboard. */
  statCards: protectedProcedure
    .input(z.object({ siteId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where: Prisma.BookingWhereInput = baseScope(ctx.session);
      if (input?.siteId) where.siteId = input.siteId;

      const todayWhere = {
        ...where,
        readyByTime: { gte: startOfToday(), lte: endOfToday() },
      };

      const [total, pending, inProgress, completedToday, completedAll] =
        await Promise.all([
          ctx.prisma.booking.count({ where: todayWhere }),
          ctx.prisma.booking.count({
            where: { ...where, status: BookingStatus.PENDING },
          }),
          ctx.prisma.booking.count({
            where: { ...where, status: BookingStatus.IN_PROGRESS },
          }),
          ctx.prisma.booking.count({
            where: { ...todayWhere, status: BookingStatus.COMPLETED },
          }),
          ctx.prisma.booking.findMany({
            where: {
              ...where,
              status: BookingStatus.COMPLETED,
              completedAt: { not: null },
            },
            select: { createdAt: true, completedAt: true },
            take: 200,
            orderBy: { completedAt: "desc" },
          }),
        ]);

      const durations = completedAll
        .filter((b) => b.completedAt)
        .map((b) => (b.completedAt!.getTime() - b.createdAt.getTime()) / 60000);
      const avgTimeMins =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;

      return {
        totalToday: total,
        pending,
        inProgress,
        completedToday,
        avgTimeMins,
      };
    }),

  /** Per-site breakdown for org-level operations centre. */
  siteStats: protectedProcedure.query(async ({ ctx }) => {
    const sites = await ctx.prisma.site.findMany({
      where: { organisationId: ctx.session.organisationId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const todayWhere = {
      organisationId: ctx.session.organisationId,
      readyByTime: { gte: startOfToday(), lte: endOfToday() },
    };

    const grouped = await ctx.prisma.booking.groupBy({
      by: ["siteId", "status"],
      where: todayWhere,
      _count: { _all: true },
    });

    return sites.map((site) => {
      const rows = grouped.filter((g) => g.siteId === site.id);
      const countFor = (s: BookingStatus) =>
        rows.find((r) => r.status === s)?._count._all ?? 0;
      const total = rows.reduce((acc, r) => acc + r._count._all, 0);
      return {
        siteId: site.id,
        siteName: site.name,
        total,
        pending: countFor(BookingStatus.PENDING),
        inProgress: countFor(BookingStatus.IN_PROGRESS),
        completed: countFor(BookingStatus.COMPLETED),
      };
    });
  }),

  fullReport: protectedProcedure
    .input(
      z.object({
        from: z.string().optional(), // ISO date string
        to: z.string().optional(),
        siteId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.BookingWhereInput = {
        organisationId: ctx.session.organisationId,
        ...(input.siteId ? { siteId: input.siteId } : {}),
        ...(input.from || input.to
          ? {
              createdAt: {
                ...(input.from ? { gte: new Date(input.from) } : {}),
                ...(input.to ? { lte: new Date(input.to + "T23:59:59") } : {}),
              },
            }
          : {}),
      };

      const [total, completed, cancelled, , completedWithTimes] =
        await Promise.all([
          ctx.prisma.booking.count({ where }),
          ctx.prisma.booking.count({
            where: { ...where, status: "COMPLETED" },
          }),
          ctx.prisma.booking.count({
            where: { ...where, status: "CANCELLED" },
          }),
          ctx.prisma.booking.groupBy({
            by: ["serviceTypeId"],
            where: {
              ...where,
              status: "COMPLETED",
              completedAt: { not: null },
            },
            _count: { _all: true },
          }),
          ctx.prisma.booking.findMany({
            where: {
              ...where,
              status: "COMPLETED",
              completedAt: { not: null },
            },
            select: {
              id: true,
              siteId: true,
              serviceTypeId: true,
              serviceType: { select: { name: true, durationMins: true } },
              site: { select: { name: true } },
              createdAt: true,
              completedAt: true,
            },
          }),
        ]);

      // Average time per valet type
      const avgByType = new Map<
        string,
        { name: string; totalMins: number; count: number; targetMins: number }
      >();
      for (const b of completedWithTimes) {
        if (!b.completedAt) continue;
        const mins = (b.completedAt.getTime() - b.createdAt.getTime()) / 60000;
        const key = b.serviceTypeId;
        const existing = avgByType.get(key) ?? {
          name: b.serviceType.name,
          totalMins: 0,
          count: 0,
          targetMins: b.serviceType.durationMins,
        };
        existing.totalMins += mins;
        existing.count += 1;
        avgByType.set(key, existing);
      }

      // Average time per site
      const avgBySite = new Map<
        string,
        { name: string; totalMins: number; count: number }
      >();
      for (const b of completedWithTimes) {
        if (!b.completedAt) continue;
        const mins = (b.completedAt.getTime() - b.createdAt.getTime()) / 60000;
        const existing = avgBySite.get(b.siteId) ?? {
          name: b.site.name,
          totalMins: 0,
          count: 0,
        };
        existing.totalMins += mins;
        existing.count += 1;
        avgBySite.set(b.siteId, existing);
      }

      const completionRate =
        total > 0 ? Math.round((completed / total) * 100) : 0;
      const overallAvgMins =
        completedWithTimes.length > 0
          ? Math.round(
              completedWithTimes
                .filter((b) => b.completedAt)
                .reduce(
                  (acc, b) =>
                    acc +
                    (b.completedAt!.getTime() - b.createdAt.getTime()) / 60000,
                  0,
                ) / completedWithTimes.length,
            )
          : 0;

      return {
        total,
        completed,
        cancelled,
        completionRate,
        overallAvgMins,
        byValetType: Array.from(avgByType.values()).map((v) => ({
          name: v.name,
          count: v.count,
          avgMins: v.count > 0 ? Math.round(v.totalMins / v.count) : 0,
          targetMins: v.targetMins,
        })),
        bySite: Array.from(avgBySite.values()).map((v) => ({
          name: v.name,
          count: v.count,
          avgMins: v.count > 0 ? Math.round(v.totalMins / v.count) : 0,
        })),
      };
    }),
});
