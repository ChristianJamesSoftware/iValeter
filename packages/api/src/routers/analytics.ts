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
});
