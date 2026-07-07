import { z } from "zod";
import { router, protectedProcedure, orgAdminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

/**
 * Valeter-facing timesheet router.
 * Valeters can view/submit their own timesheets.
 * Org admins can review, push to site manager, and action disputes.
 */
export const valeterTimesheetsRouter = router({
  /**
   * Get the current week's timesheet for the logged-in valeter,
   * auto-creating it if it doesn't exist.
   * Prefills lines from clock events + completed bookings.
   */
  myCurrentWeek: protectedProcedure.query(async ({ ctx }) => {
    const now = new Date();
    // Week starts on Monday
    const day = now.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const userId = ctx.session.userId;
    const siteId = ctx.session.siteId;
    if (!siteId) throw new TRPCError({ code: "BAD_REQUEST", message: "No site assigned" });

    // Upsert timesheet
    let timesheet = await ctx.prisma.timesheet.findUnique({
      where: { userId_weekStarting: { userId, weekStarting: weekStart } },
      include: { lines: true },
    });
    if (!timesheet) {
      timesheet = await ctx.prisma.timesheet.create({
        data: {
          userId,
          siteId,
          weekStarting: weekStart,
          weekEnding: weekEnd,
          status: "DRAFT",
        },
        include: { lines: true },
      });
    }

    // Pull clock events for this week
    const clockEvents = await ctx.prisma.clockEvent.findMany({
      where: {
        userId,
        timestamp: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { timestamp: "asc" },
    });

    // Pull completed bookings for this week
    const completedBookings = await ctx.prisma.booking.findMany({
      where: {
        assignedToId: userId,
        status: "COMPLETED",
        readyByTime: { gte: weekStart, lte: weekEnd },
      },
      select: {
        id: true,
        vehicleReg: true,
        customerName: true,
        readyByTime: true,
        serviceType: { select: { name: true, durationMins: true } },
      },
      orderBy: { readyByTime: "asc" },
    });

    // User schedule
    const user = await ctx.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, workingDays: true, contractedHours: true, dailyRate: true },
    });

    return {
      timesheet,
      clockEvents: clockEvents.map((e) => ({
        id: e.id,
        type: e.type,
        timestamp: e.timestamp.toISOString(),
        latitude: (e as Record<string, unknown>).latitude as number | null ?? null,
        longitude: (e as Record<string, unknown>).longitude as number | null ?? null,
      })),
      completedBookings: completedBookings.map((b) => ({
        id: b.id,
        vehicleReg: b.vehicleReg,
        customerName: b.customerName,
        readyByTime: b.readyByTime.toISOString(),
        serviceTypeName: b.serviceType.name,
        durationMins: b.serviceType.durationMins,
      })),
      user,
    };
  }),

  /** List all timesheets for the valeter (pay history) */
  myHistory: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.timesheet.findMany({
      where: { userId: ctx.session.userId },
      orderBy: { weekStarting: "desc" },
      select: {
        id: true,
        weekStarting: true,
        weekEnding: true,
        status: true,
        totalRegularHours: true,
        totalOvertimeHours: true,
        customerAccepted: true,
        autoAccepted: true,
        sentToCustomerAt: true,
        customerAcceptedAt: true,
      },
    });
  }),

  /** Submit timesheet — moves status to SUBMITTED */
  submit: protectedProcedure
    .input(z.object({ timesheetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findFirst({
        where: { id: input.timesheetId, userId: ctx.session.userId },
      });
      if (!ts) throw new TRPCError({ code: "NOT_FOUND" });
      if (ts.status !== "DRAFT")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Timesheet already submitted" });

      return ctx.prisma.timesheet.update({
        where: { id: input.timesheetId },
        data: { status: "SUBMITTED" },
      });
    }),

  /**
   * HQ: list all submitted timesheets for review.
   */
  listPendingReview: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.timesheet.findMany({
      where: {
        user: { organisationId: ctx.session.organisationId },
        status: "SUBMITTED",
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            payId: true,
            site: { select: { name: true, customerContactEmail: true, customerContactName: true } },
          },
        },
        site: { select: { name: true } },
        lines: true,
      },
      orderBy: { weekStarting: "desc" },
    });
  }),

  /**
   * HQ: push timesheet to site manager for approval.
   * Sets sentToCustomerAt and starts the 4-hour window.
   */
  pushToSiteManager: orgAdminProcedure
    .input(z.object({ timesheetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findFirst({
        where: { id: input.timesheetId, user: { organisationId: ctx.session.organisationId } },
      });
      if (!ts) throw new TRPCError({ code: "NOT_FOUND" });
      return ctx.prisma.timesheet.update({
        where: { id: input.timesheetId },
        data: { sentToCustomerAt: new Date() },
      });
    }),

  /**
   * Site manager: approve timesheet.
   */
  siteManagerApprove: protectedProcedure
    .input(z.object({ timesheetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.timesheet.update({
        where: { id: input.timesheetId },
        data: {
          customerAccepted: true,
          customerAcceptedAt: new Date(),
          status: "APPROVED",
        },
      });
    }),

  /**
   * Site manager: query/dispute timesheet.
   */
  siteManagerQuery: protectedProcedure
    .input(z.object({ timesheetId: z.string(), note: z.string().min(5) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.timesheet.update({
        where: { id: input.timesheetId },
        data: {
          status: "DISPUTED",
          customerDisputeNote: input.note,
        },
      });
    }),

  /**
   * HQ: get full detail for a single timesheet — per-day clock lines,
   * allocated vs actual hours, extra lines, valeter info.
   */
  getDetail: orgAdminProcedure
    .input(z.object({ timesheetId: z.string() }))
    .query(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findFirst({
        where: {
          id: input.timesheetId,
          user: { organisationId: ctx.session.organisationId },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dailyRate: true,
              contractedHours: true,
              workingDays: true,
              site: { select: { name: true } },
            },
          },
          site: { select: { name: true } },
          lines: { orderBy: { date: "asc" } },
          extraLines: { orderBy: { createdAt: "asc" } },
        },
      });
      if (!ts) throw new TRPCError({ code: "NOT_FOUND" });

      // Pull clock events for this week so we can show AM/PM times
      const clockEvents = await ctx.prisma.clockEvent.findMany({
        where: {
          userId: ts.userId,
          timestamp: { gte: ts.weekStarting, lte: ts.weekEnding },
        },
        orderBy: { timestamp: "asc" },
      });

      // Pull completed bookings for actual work hours
      const completedBookings = await ctx.prisma.booking.findMany({
        where: {
          assignedToId: ts.userId,
          status: "COMPLETED",
          readyByTime: { gte: ts.weekStarting, lte: ts.weekEnding },
        },
        select: {
          id: true,
          readyByTime: true,
          serviceType: { select: { durationMins: true } },
        },
      });

      // Group bookings by day — sum actual booked minutes
      const bookedMinsByDay = new Map<string, number>();
      for (const b of completedBookings) {
        const key = b.readyByTime.toISOString().slice(0, 10);
        bookedMinsByDay.set(key, (bookedMinsByDay.get(key) ?? 0) + b.serviceType.durationMins);
      }

      // Pair clock events into in/out per day
      type ClockPair = { inTime: string | null; outTime: string | null };
      const clockPairsByDay = new Map<string, ClockPair>();
      let pendingIn: string | null = null;
      let pendingDay: string | null = null;
      for (const e of clockEvents) {
        const day = e.timestamp.toISOString().slice(0, 10);
        if (e.type === "CLOCK_IN") {
          pendingIn = e.timestamp.toISOString();
          pendingDay = day;
        } else if (e.type === "CLOCK_OUT" && pendingIn) {
          clockPairsByDay.set(pendingDay!, { inTime: pendingIn, outTime: e.timestamp.toISOString() });
          pendingIn = null;
          pendingDay = null;
        }
      }
      if (pendingIn && pendingDay) {
        clockPairsByDay.set(pendingDay, { inTime: pendingIn, outTime: null });
      }

      const dailyRate = ts.user.dailyRate ?? 0;
      const allocatedHoursPerDay = ts.user.contractedHours ?? 8;
      const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0;

      // Build 7-day grid Mon–Sun
      const days: {
        date: string;         // ISO date YYYY-MM-DD
        dayName: string;      // Mon, Tue…
        lineId: string | null;
        clockIn: string | null;
        clockOut: string | null;
        actualHours: number;  // from clock in/out
        allocatedHours: number;
        bookedMins: number;   // from completed bookings
        regularHours: number; // from TimesheetLine
        overtimeHours: number;
        breakMins: number;
        note: string | null;
      }[] = [];

      const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      for (let i = 0; i < 7; i++) {
        const d = new Date(ts.weekStarting);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const clock = clockPairsByDay.get(key) ?? { inTime: null, outTime: null };
        const tsLine = ts.lines.find((l) => l.date.toISOString().slice(0, 10) === key);

        // Actual hours from clock events
        let actualHours = 0;
        if (clock.inTime && clock.outTime) {
          const diffMs = new Date(clock.outTime).getTime() - new Date(clock.inTime).getTime();
          actualHours = Math.round((diffMs / 3_600_000) * 10) / 10;
        }

        days.push({
          date: key,
          dayName: DAY_NAMES[i] ?? "",
          lineId: tsLine?.id ?? null,
          clockIn: clock.inTime,
          clockOut: clock.outTime,
          actualHours,
          allocatedHours: allocatedHoursPerDay,
          bookedMins: bookedMinsByDay.get(key) ?? 0,
          regularHours: tsLine?.regularHours ?? 0,
          overtimeHours: tsLine?.overtimeHours ?? 0,
          breakMins: tsLine?.breakMins ?? 60,
          note: tsLine?.note ?? null,
        });
      }

      return {
        id: ts.id,
        status: ts.status,
        weekStarting: ts.weekStarting.toISOString(),
        weekEnding: ts.weekEnding.toISOString(),
        siteName: ts.site.name,
        valeter: {
          id: ts.user.id,
          firstName: ts.user.firstName,
          lastName: ts.user.lastName,
          dailyRate,
          hourlyRate,
          allocatedHoursPerDay,
          workingDays: ts.user.workingDays,
        },
        totalRegularHours: ts.totalRegularHours,
        totalOvertimeHours: ts.totalOvertimeHours,
        days,
        extraLines: ts.extraLines.map((el) => ({
          id: el.id,
          description: el.description,
          ratePence: el.ratePence,
          isRecurring: el.isRecurring,
        })),
        sentToCustomerAt: ts.sentToCustomerAt?.toISOString() ?? null,
        customerAccepted: ts.customerAccepted,
        autoAccepted: ts.autoAccepted,
        customerAcceptedAt: ts.customerAcceptedAt?.toISOString() ?? null,
      };
    }),

  /**
   * Auto-approve timesheets where sentToCustomerAt > 4 hours ago.
   * Called by a cron job every 15 minutes.
   */
  autoApproveDue: orgAdminProcedure.mutation(async ({ ctx }) => {
    const cutoff = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const result = await ctx.prisma.timesheet.updateMany({
      where: {
        user: { organisationId: ctx.session.organisationId },
        sentToCustomerAt: { lte: cutoff },
        customerAccepted: false,
        status: { notIn: ["APPROVED", "DISPUTED", "LOCKED"] },
      },
      data: {
        customerAccepted: true,
        autoAccepted: true,
        customerAcceptedAt: new Date(),
        status: "APPROVED",
      },
    });
    return { autoApproved: result.count };
  }),
});
