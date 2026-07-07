import { z } from "zod";
import { router, orgAdminProcedure, superAdminProcedure, protectedProcedure } from "../trpc";
import type { Role } from "@ivaleter/db";

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
  /** Returns distinct week-starting dates that have at least one timesheet */
  payrollWeeks: orgAdminProcedure.query(async ({ ctx }) => {
    const weeks = await ctx.prisma.timesheet.findMany({
      where: { user: { organisationId: ctx.session.organisationId } },
      select: { weekStarting: true },
      distinct: ["weekStarting"],
      orderBy: { weekStarting: "desc" },
      take: 12,
    });
    return weeks.map((w) => w.weekStarting.toISOString().slice(0, 10));
  }),

  payrollSummary: orgAdminProcedure
    .input(z.object({ weekStart: z.string() }))
    .query(async ({ ctx, input }) => {
      const weekStartDate = new Date(input.weekStart);
      // weekEnding = weekStart + 6 days (inclusive Sun)
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);
      weekEndDate.setHours(23, 59, 59, 999);

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
              contractedHours: true,
              site: { select: { id: true, name: true } },
            },
          },
          site: { select: { id: true, name: true } },
          lines: true,
        },
        orderBy: { weekStarting: "desc" },
      });

      // Batch-fetch all clock events for all valeters in this week in one query
      const userIds = timesheets.map((ts) => ts.userId);
      const clockEvents = userIds.length > 0
        ? await ctx.prisma.clockEvent.findMany({
            where: {
              userId: { in: userIds },
              timestamp: { gte: weekStartDate, lte: weekEndDate },
            },
            orderBy: { timestamp: "asc" },
          })
        : [];

      // Group clock events by userId → Set of distinct YYYY-MM-DD days present
      // Also detect late arrivals (clock-in after 08:30 on a working day)
      const presentDaysByUser = new Map<string, Set<string>>();
      const lateCountByUser = new Map<string, number>();
      const LATE_HOUR = 8;
      const LATE_MINUTE = 30;

      for (const ce of clockEvents) {
        if (ce.type !== "CLOCK_IN") continue;
        const dayKey = ce.timestamp.toISOString().slice(0, 10);
        if (!presentDaysByUser.has(ce.userId)) presentDaysByUser.set(ce.userId, new Set());
        presentDaysByUser.get(ce.userId)!.add(dayKey);

        // Late check — Mon–Fri only (getUTCDay 1-5)
        const dow = ce.timestamp.getUTCDay();
        if (dow >= 1 && dow <= 5) {
          const h = ce.timestamp.getUTCHours();
          const m = ce.timestamp.getUTCMinutes();
          if (h > LATE_HOUR || (h === LATE_HOUR && m >= LATE_MINUTE)) {
            lateCountByUser.set(ce.userId, (lateCountByUser.get(ce.userId) ?? 0) + 1);
          }
        }
      }

      const lines = timesheets.map((ts) => {
        const regularHours = ts.totalRegularHours;
        const overtimeHours = ts.totalOvertimeHours;
        const dailyRate = ts.user.dailyRate ?? 0;
        const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0;
        const totalEstimate =
          regularHours * hourlyRate + overtimeHours * hourlyRate * 1.5;

        // Attendance — count Mon–Fri days in the week (5 working days)
        const daysPresent = presentDaysByUser.get(ts.userId)?.size ?? 0;
        const daysAbsent = Math.max(0, 5 - daysPresent);
        const lateArrivals = lateCountByUser.get(ts.userId) ?? 0;

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
          // Attendance
          daysPresent,
          daysAbsent,
          lateArrivals,
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

  /** Snapshot of a single site for the HQ slide-over — valeters + today's bookings */
  siteSnapshot: orgAdminProcedure
    .input(z.object({ siteId: z.string() }))
    .query(async ({ ctx, input }) => {
      const today = startOfToday();
      const todayEnd = endOfToday();

      const [site, valeters, bookings] = await Promise.all([
        ctx.prisma.site.findUnique({
          where: { id: input.siteId },
          select: { id: true, name: true },
        }),
        ctx.prisma.user.findMany({
          where: {
            organisationId: ctx.session.organisationId,
            siteId: input.siteId,
            role: "valeter",
            isActive: true,
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            clockEvents: {
              where: { type: "CLOCK_IN", timestamp: { gte: today, lte: todayEnd } },
              select: { id: true },
              take: 1,
            },
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        }),
        ctx.prisma.booking.findMany({
          where: {
            organisationId: ctx.session.organisationId,
            siteId: input.siteId,
            readyByTime: { gte: today, lte: todayEnd },
          },
          select: {
            id: true,
            vehicleReg: true,
            vehicleSize: true,
            status: true,
            readyByTime: true,
            serviceType: { select: { name: true } },
            customerName: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleColour: true,
          },
          orderBy: { readyByTime: "asc" },
        }),
      ]);

      return {
        siteId: input.siteId,
        siteName: site?.name ?? "",
        valeters: valeters.map((v) => ({
          id: v.id,
          name: `${v.firstName} ${v.lastName}`,
          clockedIn: v.clockEvents.length > 0,
        })),
        bookings: bookings.map((b) => ({
          id: b.id,
          vehicleReg: b.vehicleReg,
          vehicleSize: b.vehicleSize ?? "",
          status: b.status,
          readyByTime: b.readyByTime?.toISOString() ?? null,
          serviceType: b.serviceType?.name ?? "",
          customerName: b.customerName ?? "",
          vehicleDesc: [b.vehicleColour, b.vehicleMake, b.vehicleModel].filter(Boolean).join(" "),
        })),
      };
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

  /** Send a smart template broadcast */
  smartBroadcast: superAdminProcedure
    .input(
      z.object({
        templateKey: z.enum(["weekly_pulse", "five_star_share", "csi_100"]),
        // Audience: which roles to send to
        roles: z.array(z.enum(["org_admin", "dealership_user", "management"])),
        siteId: z.string().optional(),
        // For five_star_share: inject the valeter name, reg, site name into template
        variables: z.record(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const TEMPLATES: Record<string, string> = {
        weekly_pulse:
          "How did this week go? Reply to let us know: Great | Amazing | Let's catch up",
        five_star_share:
          "⭐⭐⭐⭐⭐ Great news — {valeterName} just received a 5-star review on {vehicleReg} at {siteName}. Well done the team!",
        csi_100:
          "🏆 {siteName} just scored 100% CSI this week. Congratulations to the whole team — outstanding work!",
      };

      let body = TEMPLATES[input.templateKey] ?? "";
      // Replace variables
      if (input.variables) {
        for (const [k, v] of Object.entries(input.variables)) {
          body = body.replace(new RegExp(`\\{${k}\\}`, "g"), v);
        }
      }

      // Gather recipients
      const where = {
        organisationId: ctx.session.organisationId,
        isActive: true,
        role: { in: input.roles as Role[] },
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
            body,
          })),
        });
      }

      return { ok: true, sent: users.length, body };
    }),

  /** Record a feedback reply from a valeter/manager */
  recordFeedbackReply: protectedProcedure
    .input(
      z.object({
        messageId: z.string(),
        reply: z.enum(["great", "amazing", "catchup"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.broadcastFeedbackReply.create({
        data: {
          organisationId: ctx.session.organisationId,
          messageId: input.messageId,
          fromUserId: ctx.session.userId,
          reply: input.reply,
          siteId: ctx.session.siteId ?? null,
        },
      });
    }),

  /**
   * Send an SA_APPROVED timesheet to the client (dealer) for approval.
   * Sets sentToCustomerAt and starts the 4-hour auto-accept clock.
   */
  sendToClient: superAdminProcedure
    .input(z.object({ timesheetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findUnique({
        where: { id: input.timesheetId },
        select: { id: true, status: true },
      });
      if (!ts) throw new Error("Timesheet not found");
      if (ts.status !== "SA_APPROVED")
        throw new Error("Timesheet must be SA_APPROVED before sending to client");
      return ctx.prisma.timesheet.update({
        where: { id: input.timesheetId },
        data: { sentToCustomerAt: new Date() },
      });
    }),

  /**
   * Lock a timesheet after client approval and auto-apply all preset deductions
   * from the valeter's card:
   *   - dailyDeductions × days worked  → DAILY
   *   - active ValeterDeductions (unsettled) → STANDING
   *   - outstanding accident weeklyDeductions → ACCIDENT
   */
  lockAndApplyDeductions: superAdminProcedure
    .input(z.object({ timesheetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findUnique({
        where: { id: input.timesheetId },
        include: {
          lines: { select: { regularHours: true, overtimeHours: true } },
          user: {
            select: {
              id: true,
              dailyDeductions: true,
              deductions: {
                where: { settled: false },
                select: { id: true, description: true, weeklyAmount: true },
              },
              accidents: {
                where: { settled: false, weeklyDeduction: { not: null } },
                select: { id: true, description: true, weeklyDeduction: true },
              },
            },
          },
        },
      });
      if (!ts) throw new Error("Timesheet not found");
      if (ts.status === "LOCKED") throw new Error("Timesheet is already locked");
      if (!ts.customerAccepted && ts.status !== "SA_APPROVED")
        throw new Error("Timesheet has not been approved by the client yet");

      const daysWorked = ts.lines.filter(
        (l: { regularHours: number; overtimeHours: number }) => l.regularHours > 0 || l.overtimeHours > 0
      ).length;

      const deductionsToCreate: {
        timesheetId: string;
        type: "DAILY" | "STANDING" | "ACCIDENT";
        description: string;
        amountPence: number;
        valeterDeductionId?: string;
        accidentId?: string;
        addedByUserId: string;
      }[] = [];

      // 1. Daily deductions (e.g. van contribution)
      if (ts.user.dailyDeductions && ts.user.dailyDeductions > 0 && daysWorked > 0) {
        deductionsToCreate.push({
          timesheetId: ts.id,
          type: "DAILY",
          description: `Daily deduction × ${daysWorked} day${daysWorked !== 1 ? "s" : ""}`,
          amountPence: Math.round(ts.user.dailyDeductions * daysWorked * 100),
          addedByUserId: ctx.session.userId,
        });
      }

      // 2. Standing repayment plans (uniform, equipment, etc.)
      for (const ded of ts.user.deductions) {
        deductionsToCreate.push({
          timesheetId: ts.id,
          type: "STANDING",
          description: ded.description,
          amountPence: Math.round(ded.weeklyAmount * 100),
          valeterDeductionId: ded.id,
          addedByUserId: ctx.session.userId,
        });
      }

      // 3. Accident excess weekly deductions
      for (const acc of ts.user.accidents) {
        if (acc.weeklyDeduction && acc.weeklyDeduction > 0) {
          deductionsToCreate.push({
            timesheetId: ts.id,
            type: "ACCIDENT",
            description: `Accident excess: ${acc.description ?? "recovery"}`,
            amountPence: Math.round(acc.weeklyDeduction * 100),
            accidentId: acc.id,
            addedByUserId: ctx.session.userId,
          });
        }
      }

      // Apply in a transaction: create deductions + lock the timesheet
      await ctx.prisma.$transaction([
        ...deductionsToCreate.map((d) =>
          ctx.prisma.timesheetDeduction.create({ data: d })
        ),
        ctx.prisma.timesheet.update({
          where: { id: ts.id },
          data: { status: "LOCKED" },
        }),
      ]);

      return { locked: true, deductionsApplied: deductionsToCreate.length };
    }),

  /** List feedback replies (SA only) */
  listFeedbackReplies: superAdminProcedure
    .input(
      z.object({
        siteId: z.string().optional(),
        from: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.broadcastFeedbackReply.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          ...(input.siteId ? { siteId: input.siteId } : {}),
          ...(input.from ? { createdAt: { gte: input.from } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          fromUser: { select: { firstName: true, lastName: true, role: true, site: { select: { name: true } } } },
        },
      });
    }),
});
