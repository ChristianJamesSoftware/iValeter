import { z } from "zod";
import { router, orgAdminProcedure } from "../trpc";

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

export const hqRouter = router({
  /** Aggregate problems across the org */
  alerts: orgAdminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const today = startOfToday();
    const alerts: {
      id: string;
      type: string;
      severity: "red" | "amber";
      message: string;
      siteId?: string;
      siteName?: string;
      createdAt: Date;
    }[] = [];

    try {
      // 1. Valeters not clocked in after 8:15am today
      const cutoff = new Date(today);
      cutoff.setHours(8, 15, 0, 0);
      if (now > cutoff) {
        const allValeters = await ctx.prisma.user.findMany({
          where: {
            organisationId: ctx.session.organisationId,
            role: "valeter",
            isActive: true,
          },
          select: { id: true, firstName: true, lastName: true, siteId: true, site: { select: { name: true } } },
        });

        const clockedInUserIds = await ctx.prisma.clockEvent.findMany({
          where: {
            type: "CLOCK_IN",
            timestamp: { gte: today, lte: endOfToday() },
            user: { organisationId: ctx.session.organisationId },
          },
          select: { userId: true },
        });
        const clockedInSet = new Set(clockedInUserIds.map((c) => c.userId));

        for (const v of allValeters) {
          if (!clockedInSet.has(v.id)) {
            alerts.push({
              id: `not-clocked-in-${v.id}`,
              type: "NOT_CLOCKED_IN",
              severity: "amber",
              message: `${v.firstName} ${v.lastName} has not clocked in today`,
              siteId: v.siteId ?? undefined,
              siteName: v.site?.name ?? undefined,
              createdAt: cutoff,
            });
          }
        }
      }

      // 2. Timesheets SUBMITTED but sentToCustomerAt is null and weekStarting <= 7 days ago
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      const stuckTimesheets = await ctx.prisma.timesheet.findMany({
        where: {
          user: { organisationId: ctx.session.organisationId },
          status: "SUBMITTED",
          sentToCustomerAt: null,
          weekStarting: { lte: sevenDaysAgo },
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
          site: { select: { name: true } },
        },
      });
      for (const ts of stuckTimesheets) {
        alerts.push({
          id: `stuck-timesheet-${ts.id}`,
          type: "STUCK_TIMESHEET",
          severity: "amber",
          message: `Timesheet for ${ts.user.firstName} ${ts.user.lastName} submitted but not sent (week of ${ts.weekStarting.toLocaleDateString()})`,
          siteId: ts.siteId,
          siteName: ts.site.name,
          createdAt: ts.weekStarting,
        });
      }
    } catch {
      // Return what we have so far — don't crash if tables are missing
    }

    return alerts;
  }),

  /** Payroll summary for a week */
  payrollSummary: orgAdminProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const weekStartDate = new Date(input.weekStart);

      const timesheets = await ctx.prisma.timesheet.findMany({
        where: {
          user: { organisationId: ctx.session.organisationId },
          weekStarting: weekStartDate,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dailyRate: true,
              site: { select: { id: true, name: true } },
            },
          },
          site: { select: { id: true, name: true } },
          lines: true,
        },
        orderBy: { weekStarting: "desc" },
      });

      const lines = timesheets.map((ts) => {
        const regularHours = ts.totalRegularHours;
        const overtimeHours = ts.totalOvertimeHours;
        const dailyRate = ts.user.dailyRate ?? 0;
        // Estimate: daily rate / 8h * regular hours + 1.5x for overtime
        const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0;
        const totalEstimate =
          regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5;

        return {
          userId: ts.user.id,
          timesheetId: ts.id,
          name: `${ts.user.firstName} ${ts.user.lastName}`,
          siteId: ts.site.id,
          siteName: ts.site.name,
          regularHours,
          overtimeHours,
          dailyRate,
          totalEstimate,
          status: ts.status,
        };
      });

      const totalEstimate = lines.reduce((acc, l) => acc + l.totalEstimate, 0);

      return {
        weekStart: input.weekStart,
        timesheetCount: timesheets.length,
        totalEstimate,
        lines,
      };
    }),

  /** Per-site cover and capacity status */
  siteHealth: orgAdminProcedure.query(async ({ ctx }) => {
    const today = startOfToday();
    const todayEnd = endOfToday();

    const sites = await ctx.prisma.site.findMany({
      where: { organisationId: ctx.session.organisationId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    const [valeterCounts, clockedInToday, bookingsToday] = await Promise.all([
      ctx.prisma.user.groupBy({
        by: ["siteId"],
        where: {
          organisationId: ctx.session.organisationId,
          role: "valeter",
          isActive: true,
          siteId: { in: sites.map((s) => s.id) },
        },
        _count: { _all: true },
      }),
      ctx.prisma.clockEvent.findMany({
        where: {
          type: "CLOCK_IN",
          timestamp: { gte: today, lte: todayEnd },
          site: { organisationId: ctx.session.organisationId },
        },
        select: { siteId: true, userId: true },
        distinct: ["userId"],
      }),
      ctx.prisma.booking.groupBy({
        by: ["siteId"],
        where: {
          organisationId: ctx.session.organisationId,
          readyByTime: { gte: today, lte: todayEnd },
        },
        _count: { _all: true },
      }),
    ]);

    const valeterCountMap = new Map(
      valeterCounts.map((v) => [v.siteId ?? "", v._count._all]),
    );
    const clockedInMap = new Map<string, number>();
    for (const ce of clockedInToday) {
      clockedInMap.set(ce.siteId, (clockedInMap.get(ce.siteId) ?? 0) + 1);
    }
    const bookingsMap = new Map(
      bookingsToday.map((b) => [b.siteId, b._count._all]),
    );

    return sites.map((site) => {
      const totalValeters = valeterCountMap.get(site.id) ?? 0;
      const clockedIn = clockedInMap.get(site.id) ?? 0;
      const bookingsCount = bookingsMap.get(site.id) ?? 0;
      const capacityPct =
        totalValeters > 0
          ? Math.min(100, Math.round((bookingsCount / totalValeters) * 10))
          : 0;
      const coverOk = totalValeters === 0 || clockedIn > 0;

      return {
        siteId: site.id,
        siteName: site.name,
        totalValeters,
        clockedIn,
        bookingsToday: bookingsCount,
        capacityPct,
        coverOk,
      };
    });
  }),

  /** Approve all submitted timesheets for a week */
  payrollApproveAll: orgAdminProcedure
    .input(z.object({ weekStart: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.timesheet.updateMany({
        where: {
          user: { organisationId: ctx.session.organisationId },
          weekStarting: new Date(input.weekStart),
          status: "SUBMITTED",
        },
        data: { status: "APPROVED" },
      });
      return { ok: true };
    }),

  /** Broadcast a message to multiple recipients by role/site */
  broadcast: orgAdminProcedure
    .input(
      z.object({
        role: z.enum(["valeter", "org_admin", "dealership_user", "all"]),
        siteId: z.string().optional(),
        body: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const where = {
        organisationId: ctx.session.organisationId,
        isActive: true,
        ...(input.role !== "all" ? { role: input.role } : {}),
        ...(input.siteId ? { siteId: input.siteId } : {}),
      };
      const users = await ctx.prisma.user.findMany({
        where,
        select: { id: true },
      });
      if (users.length > 0) {
        await ctx.prisma.message.createMany({
          data: users.map((u) => ({
            fromUserId: ctx.session.userId,
            toUserId: u.id,
            organisationId: ctx.session.organisationId,
            body: input.body,
          })),
        });
      }
      return { ok: true, sent: users.length };
    }),
});
