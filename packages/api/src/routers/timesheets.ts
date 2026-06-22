/**
 * Timesheets Router
 *
 * Covers the full lifecycle:
 *   DRAFT (auto-generated) → SUBMITTED (valeter) → APPROVED (org_admin)
 *   → customer email sent → customerAccepted / autoAccepted → LOCKED (in pay run)
 *
 * Also handles:
 *   - Manual timesheet creation / line editing
 *   - Customer acceptance token flow (one-click email link)
 *   - Auto-accept cron trigger (called by a scheduled job)
 *   - Late confirmation logging
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { TimesheetStatus } from "@ivaleter/db";
import {
  router,
  protectedProcedure,
  orgAdminProcedure,
  valeterProcedure,
} from "../trpc";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Start of the ISO week (Monday 00:00:00 UTC) containing a given date. */
function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 = Sun
  const diff = (day === 0 ? -6 : 1) - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/** Sunday 23:59:59 UTC of the week containing `weekStarting`. */
function weekEnd(weekStarting: Date): Date {
  const d = new Date(weekStarting);
  d.setUTCDate(d.getUTCDate() + 6);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Calculate regular and overtime hours from clock-in/out times.
 * Standard day = 8 working hours (480 mins) after deducting break.
 * Everything beyond that is overtime.
 */
function calcHours(
  clockIn: Date,
  clockOut: Date,
  breakMins: number,
): { regularHours: number; overtimeHours: number } {
  const totalMins =
    (clockOut.getTime() - clockIn.getTime()) / 60_000 - breakMins;
  const worked = Math.max(0, totalMins);
  const standardMins = 480; // 8 hours
  const regular = Math.min(worked, standardMins) / 60;
  const overtime = Math.max(0, worked - standardMins) / 60;
  return {
    regularHours: Math.round(regular * 100) / 100,
    overtimeHours: Math.round(overtime * 100) / 100,
  };
}

// ─── Router ──────────────────────────────────────────────────────────────────

export const timesheetsRouter = router({
  // ── LIST ──────────────────────────────────────────────────────────────────

  /** List timesheets — org_admin sees all for their org; valeters see own only. */
  list: protectedProcedure
    .input(
      z
        .object({
          siteId: z.string().optional(),
          userId: z.string().optional(),
          status: z.nativeEnum(TimesheetStatus).optional(),
          weekStarting: z.date().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const isAdmin =
        ctx.session.role === "org_admin" ||
        ctx.session.role === "super_admin";

      return ctx.prisma.timesheet.findMany({
        where: {
          // Org isolation via site → organisation
          site: { organisationId: ctx.session.organisationId },
          // Valeters can only see their own
          userId: isAdmin
            ? input?.userId
            : ctx.session.userId,
          siteId: input?.siteId,
          status: input?.status,
          weekStarting: input?.weekStarting,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          site: { select: { id: true, name: true } },
          lines: { orderBy: { date: "asc" } },
          _count: { select: { lines: true } },
        },
        orderBy: [{ weekStarting: "desc" }, { user: { lastName: "asc" } }],
      });
    }),

  // ── GET BY ID ─────────────────────────────────────────────────────────────

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const isAdmin =
        ctx.session.role === "org_admin" ||
        ctx.session.role === "super_admin";

      const timesheet = await ctx.prisma.timesheet.findFirst({
        where: {
          id: input.id,
          site: { organisationId: ctx.session.organisationId },
          ...(isAdmin ? {} : { userId: ctx.session.userId }),
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              bankAccountName: true,
            },
          },
          site: {
            select: {
              id: true,
              name: true,
              customerContactName: true,
              customerContactEmail: true,
            },
          },
          lines: { orderBy: { date: "asc" } },
          payRunLine: {
            select: {
              id: true,
              totalAmount: true,
              payRun: { select: { id: true, status: true, weekStarting: true } },
            },
          },
        },
      });

      if (!timesheet) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet not found",
        });
      }

      return timesheet;
    }),

  // ── GENERATE FROM CLOCK EVENTS ────────────────────────────────────────────

  /**
   * Generate (or regenerate) a timesheet for a given valeter + week from
   * ClockEvents. Called by the Sunday-night cron job and also available
   * manually by org_admin to rebuild a sheet.
   */
  generate: orgAdminProcedure
    .input(
      z.object({
        userId: z.string(),
        siteId: z.string(),
        weekOf: z.date(), // Any date within the target week
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ws = weekStart(input.weekOf);
      const we = weekEnd(ws);

      // Guard: don't regenerate a LOCKED timesheet
      const existing = await ctx.prisma.timesheet.findFirst({
        where: { userId: input.userId, weekStarting: ws },
      });
      if (existing?.status === TimesheetStatus.LOCKED) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot regenerate a locked timesheet",
        });
      }

      // Fetch clock events for the week
      const events = await ctx.prisma.clockEvent.findMany({
        where: {
          userId: input.userId,
          siteId: input.siteId,
          timestamp: { gte: ws, lte: we },
        },
        orderBy: { timestamp: "asc" },
      });

      // Pair CLOCK_IN / CLOCK_OUT by calendar day
      const byDay = new Map<string, { clockIn?: Date; clockOut?: Date }>();
      for (const ev of events) {
        const key = ev.timestamp.toISOString().slice(0, 10);
        const entry = byDay.get(key) ?? {};
        if (ev.type === "CLOCK_IN" && !entry.clockIn) {
          entry.clockIn = ev.timestamp;
        }
        if (ev.type === "CLOCK_OUT") {
          // Keep the latest CLOCK_OUT
          if (!entry.clockOut || ev.timestamp > entry.clockOut) {
            entry.clockOut = ev.timestamp;
          }
        }
        byDay.set(key, entry);
      }

      // Build lines
      const lines: {
        date: Date;
        clockInTime?: Date;
        clockOutTime?: Date;
        breakMins: number;
        regularHours: number;
        overtimeHours: number;
      }[] = [];

      let totalRegularHours = 0;
      let totalOvertimeHours = 0;

      for (const [dateStr, { clockIn, clockOut }] of byDay.entries()) {
        const date = new Date(dateStr + "T00:00:00Z");
        const breakMins = 60; // default 1hr lunch

        let regularHours = 0;
        let overtimeHours = 0;

        if (clockIn && clockOut) {
          const calc = calcHours(clockIn, clockOut, breakMins);
          regularHours = calc.regularHours;
          overtimeHours = calc.overtimeHours;
        }

        totalRegularHours += regularHours;
        totalOvertimeHours += overtimeHours;

        lines.push({
          date,
          clockInTime: clockIn,
          clockOutTime: clockOut,
          breakMins,
          regularHours,
          overtimeHours,
        });
      }

      // Upsert the timesheet
      const timesheet = await ctx.prisma.timesheet.upsert({
        where: {
          userId_weekStarting: { userId: input.userId, weekStarting: ws },
        },
        create: {
          userId: input.userId,
          siteId: input.siteId,
          weekStarting: ws,
          weekEnding: we,
          totalRegularHours,
          totalOvertimeHours,
          status: TimesheetStatus.DRAFT,
        },
        update: {
          totalRegularHours,
          totalOvertimeHours,
          status: TimesheetStatus.DRAFT,
          // Reset customer acceptance on regeneration
          customerAccepted: false,
          customerAcceptedAt: null,
          autoAccepted: false,
          approvedAt: null,
          approvedByUserId: null,
          sentToCustomerAt: null,
        },
      });

      // Delete existing lines and recreate
      await ctx.prisma.timesheetLine.deleteMany({
        where: { timesheetId: timesheet.id },
      });

      if (lines.length > 0) {
        await ctx.prisma.timesheetLine.createMany({
          data: lines.map((l) => ({ timesheetId: timesheet.id, ...l })),
        });
      }

      return ctx.prisma.timesheet.findUnique({
        where: { id: timesheet.id },
        include: { lines: { orderBy: { date: "asc" } } },
      });
    }),

  // ── VALETER SUBMIT ────────────────────────────────────────────────────────

  /** Valeter reviews auto-generated sheet and submits for head office approval. */
  submit: valeterProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findFirst({
        where: {
          id: input.id,
          userId: ctx.session.userId,
          status: { in: [TimesheetStatus.DRAFT] },
        },
      });

      if (!ts) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet not found or already submitted",
        });
      }

      return ctx.prisma.timesheet.update({
        where: { id: ts.id },
        data: { status: TimesheetStatus.SUBMITTED },
      });
    }),

  // ── UPDATE LINE ───────────────────────────────────────────────────────────

  /**
   * Org admin can adjust a timesheet line (e.g. correct a missed clock-out).
   * Recalculates hours for that line and updates the timesheet totals.
   */
  updateLine: orgAdminProcedure
    .input(
      z.object({
        lineId: z.string(),
        clockInTime: z.date().optional(),
        clockOutTime: z.date().optional(),
        breakMins: z.number().int().min(0).max(120).optional(),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const line = await ctx.prisma.timesheetLine.findFirst({
        where: {
          id: input.lineId,
          timesheet: { site: { organisationId: ctx.session.organisationId } },
        },
        include: { timesheet: true },
      });

      if (!line) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Line not found" });
      }

      if (line.timesheet.status === TimesheetStatus.LOCKED) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot edit a locked timesheet",
        });
      }

      const clockIn = input.clockInTime ?? line.clockInTime ?? undefined;
      const clockOut = input.clockOutTime ?? line.clockOutTime ?? undefined;
      const breakMins = input.breakMins ?? line.breakMins;

      let regularHours = line.regularHours;
      let overtimeHours = line.overtimeHours;

      if (clockIn && clockOut) {
        const calc = calcHours(clockIn, clockOut, breakMins);
        regularHours = calc.regularHours;
        overtimeHours = calc.overtimeHours;
      }

      await ctx.prisma.timesheetLine.update({
        where: { id: line.id },
        data: {
          clockInTime: clockIn,
          clockOutTime: clockOut,
          breakMins,
          regularHours,
          overtimeHours,
          note: input.note ?? line.note,
        },
      });

      // Recalculate timesheet totals
      const allLines = await ctx.prisma.timesheetLine.findMany({
        where: { timesheetId: line.timesheetId },
      });

      const totalRegularHours = allLines.reduce(
        (s, l) => s + (l.id === line.id ? regularHours : l.regularHours),
        0,
      );
      const totalOvertimeHours = allLines.reduce(
        (s, l) => s + (l.id === line.id ? overtimeHours : l.overtimeHours),
        0,
      );

      return ctx.prisma.timesheet.update({
        where: { id: line.timesheetId },
        data: { totalRegularHours, totalOvertimeHours },
        include: { lines: { orderBy: { date: "asc" } } },
      });
    }),

  // ── HEAD OFFICE APPROVE ───────────────────────────────────────────────────

  /**
   * Org admin approves a timesheet.
   * Sets status → APPROVED, records approver + timestamp.
   * The caller is responsible for triggering the customer notification email
   * (the web layer reads sentToCustomerAt to know if the email is pending).
   */
  approve: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findFirst({
        where: {
          id: input.id,
          site: { organisationId: ctx.session.organisationId },
          status: {
            in: [TimesheetStatus.SUBMITTED, TimesheetStatus.DRAFT],
          },
        },
        include: {
          site: {
            select: {
              customerContactEmail: true,
              customerContactName: true,
            },
          },
          user: { select: { firstName: true, lastName: true } },
        },
      });

      if (!ts) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet not found or not in an approvable state",
        });
      }

      return ctx.prisma.timesheet.update({
        where: { id: ts.id },
        data: {
          status: TimesheetStatus.APPROVED,
          approvedByUserId: ctx.session.userId,
          approvedAt: new Date(),
          sentToCustomerAt: new Date(), // web layer sends the email
        },
        include: {
          user: { select: { firstName: true, lastName: true } },
          site: {
            select: {
              customerContactEmail: true,
              customerContactName: true,
            },
          },
          lines: { orderBy: { date: "asc" } },
        },
      });
    }),

  // ── CUSTOMER ACCEPT ───────────────────────────────────────────────────────

  /**
   * Called when the customer clicks the "Accept" link in the approval email.
   * This endpoint is PUBLIC (no session) — it uses a signed timesheetId embedded
   * in the email link. The web layer validates the token before calling.
   */
  customerAccept: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        /** If true, this was triggered by the 24hr auto-accept cron. */
        auto: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findFirst({
        where: {
          id: input.id,
          site: { organisationId: ctx.session.organisationId },
          status: TimesheetStatus.APPROVED,
          customerAccepted: false,
        },
      });

      if (!ts) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet not found or already accepted",
        });
      }

      return ctx.prisma.timesheet.update({
        where: { id: ts.id },
        data: {
          customerAccepted: true,
          customerAcceptedAt: new Date(),
          autoAccepted: input.auto,
        },
      });
    }),

  // ── CUSTOMER DISPUTE ──────────────────────────────────────────────────────

  /** Customer raises a dispute with a note. Sets status → DISPUTED. */
  customerDispute: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        note: z.string().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findFirst({
        where: {
          id: input.id,
          site: { organisationId: ctx.session.organisationId },
          status: TimesheetStatus.APPROVED,
        },
      });

      if (!ts) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet not found",
        });
      }

      return ctx.prisma.timesheet.update({
        where: { id: ts.id },
        data: {
          status: TimesheetStatus.DISPUTED,
          customerDisputeNote: input.note,
        },
      });
    }),

  // ── RESOLVE DISPUTE ───────────────────────────────────────────────────────

  /**
   * Org admin resolves a dispute — moves status back to APPROVED and clears
   * the dispute note so the 24hr window restarts.
   */
  resolveDispute: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        resolution: z.string().min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findFirst({
        where: {
          id: input.id,
          site: { organisationId: ctx.session.organisationId },
          status: TimesheetStatus.DISPUTED,
        },
      });

      if (!ts) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet not found or not in DISPUTED state",
        });
      }

      return ctx.prisma.timesheet.update({
        where: { id: ts.id },
        data: {
          status: TimesheetStatus.APPROVED,
          customerDisputeNote: null,
          sentToCustomerAt: new Date(), // triggers a fresh 24hr window
        },
      });
    }),

  // ── LATE CONFIRMATION ─────────────────────────────────────────────────────

  /**
   * Customer provides a signed physical timesheet after the fact.
   * Logs the late confirmation timestamp — timesheet remains LOCKED/processed.
   */
  lateConfirm: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findFirst({
        where: {
          id: input.id,
          site: { organisationId: ctx.session.organisationId },
        },
      });

      if (!ts) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Timesheet not found" });
      }

      return ctx.prisma.timesheet.update({
        where: { id: ts.id },
        data: { lateConfirmedAt: new Date() },
      });
    }),

  // ── AUTO-ACCEPT BATCH (called by cron) ────────────────────────────────────

  /**
   * Finds all APPROVED timesheets where the 24hr acceptance window has passed
   * and marks them auto-accepted.
   * Called by a scheduled cron job (every hour is sufficient).
   */
  processAutoAccepts: orgAdminProcedure.mutation(async ({ ctx }) => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pending = await ctx.prisma.timesheet.findMany({
      where: {
        site: { organisationId: ctx.session.organisationId },
        status: TimesheetStatus.APPROVED,
        customerAccepted: false,
        sentToCustomerAt: { lte: cutoff },
      },
    });

    await ctx.prisma.timesheet.updateMany({
      where: { id: { in: pending.map((t) => t.id) } },
      data: {
        customerAccepted: true,
        customerAcceptedAt: new Date(),
        autoAccepted: true,
      },
    });

    return { processed: pending.length };
  }),

  // ── SUMMARY (for pay run generation) ──────────────────────────────────────

  /**
   * Returns all timesheets eligible for inclusion in a pay run:
   * APPROVED + customerAccepted (or autoAccepted) + not yet LOCKED.
   */
  eligibleForPayRun: orgAdminProcedure
    .input(z.object({ weekStarting: z.date() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.timesheet.findMany({
        where: {
          site: { organisationId: ctx.session.organisationId },
          weekStarting: input.weekStarting,
          status: TimesheetStatus.APPROVED,
          customerAccepted: true,
          payRunLine: null, // not yet in a pay run
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              bankSortCode: true,
              bankAccountNumber: true,
              bankAccountName: true,
              bankReference: true,
              contractorRates: {
                orderBy: { effectiveFrom: "desc" },
                take: 1,
              },
            },
          },
          site: { select: { name: true } },
          lines: true,
        },
      });
    }),
});
