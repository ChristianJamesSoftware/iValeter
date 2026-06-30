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
