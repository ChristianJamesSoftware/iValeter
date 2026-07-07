import { z } from "zod";
import type { Prisma } from "@ivaleter/db";
import { router, orgAdminProcedure, superAdminProcedure } from "../trpc";

const TIMESHEET_INCLUDE = {
  user: {
    select: {
      firstName: true,
      lastName: true,
      payId: true,
      dailyRate: true,
      site: { select: { name: true } },
    },
  },
  site: { select: { id: true, name: true } },
  lines: true,
} as const;

export const timesheetsRouter = router({
  // ── Org admin: list timesheets for their org ────────────────────────────
  list: orgAdminProcedure
    .input(
      z.object({
        weekStart: z.string().optional(),
        siteId: z.string().optional(),
        departmentId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TimesheetWhereInput = {
        user: { organisationId: ctx.session.organisationId },
      };
      if (input.weekStart) where.weekStarting = new Date(input.weekStart);
      if (input.siteId) where.siteId = input.siteId;

      return ctx.prisma.timesheet.findMany({
        where,
        include: TIMESHEET_INCLUDE,
        orderBy: { weekStarting: "desc" },
      });
    }),

  // ── Org admin: sign-off (4-hour window) ────────────────────────────────
  orgApprove: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findFirst({
        where: { id: input.id, user: { organisationId: ctx.session.organisationId } },
      });
      if (!ts) throw new Error("Timesheet not found");
      if (ts.status !== "SUBMITTED")
        throw new Error("Timesheet must be SUBMITTED before org sign-off");
      return ctx.prisma.timesheet.update({
        where: { id: input.id },
        data: {
          status: "APPROVED",
          approvedByUserId: ctx.session.userId,
          approvedAt: new Date(),
        },
      });
    }),

  orgReject: orgAdminProcedure
    .input(z.object({ id: z.string(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findFirst({
        where: { id: input.id, user: { organisationId: ctx.session.organisationId } },
      });
      if (!ts) throw new Error("Timesheet not found");
      return ctx.prisma.timesheet.update({
        where: { id: input.id },
        data: { status: "DISPUTED", customerDisputeNote: input.note ?? null },
      });
    }),

  // ── Super Admin: list ALL timesheets across the platform ───────────────
  superAdminList: superAdminProcedure
    .input(
      z.object({
        weekStart: z.string().optional(),
        siteId: z.string().optional(),
        organisationId: z.string().optional(),
        status: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TimesheetWhereInput = {};
      if (input.weekStart) where.weekStarting = new Date(input.weekStart);
      if (input.siteId) where.siteId = input.siteId;
      if (input.organisationId)
        where.user = { organisationId: input.organisationId };
      if (input.status) where.status = input.status as never;

      return ctx.prisma.timesheet.findMany({
        where,
        include: {
          ...TIMESHEET_INCLUDE,
          user: {
            select: {
              firstName: true,
              lastName: true,
              payId: true,
              dailyRate: true,
              site: { select: { name: true } },
              organisation: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: [{ weekStarting: "desc" }, { updatedAt: "desc" }],
      });
    }),

  // ── Super Admin: final approval ─────────────────────────────────────────
  superAdminApprove: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ts = await ctx.prisma.timesheet.findUnique({ where: { id: input.id } });
      if (!ts) throw new Error("Timesheet not found");
      if (ts.status !== "APPROVED")
        throw new Error("Timesheet must be APPROVED by Head Office before Super Admin approval");
      return ctx.prisma.timesheet.update({
        where: { id: input.id },
        data: {
          status: "SA_APPROVED",
          saApprovedByUserId: ctx.session.userId,
          saApprovedAt: new Date(),
        },
      });
    }),

  superAdminReject: superAdminProcedure
    .input(z.object({ id: z.string(), note: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.timesheet.update({
        where: { id: input.id },
        data: {
          status: "DISPUTED",
          customerDisputeNote: input.note ?? null,
          saApprovedByUserId: null,
          saApprovedAt: null,
        },
      });
    }),

  // ── SA: alert counts (submitted timesheets + pending OT) ────────────────
  alertCounts: superAdminProcedure.query(async ({ ctx }) => {
    const [submitted, approved] = await Promise.all([
      ctx.prisma.timesheet.count({ where: { status: "SUBMITTED" } }),
      ctx.prisma.timesheet.count({ where: { status: "APPROVED" } }),
    ]);
    return { submitted, approved, total: submitted + approved };
  }),

  // ── SA: edit a single timesheet line (clock-in/out + hours) ────────────
  editLine: superAdminProcedure
    .input(
      z.object({
        lineId: z.string(),
        clockInTime: z.string().nullable(),   // ISO string or null
        clockOutTime: z.string().nullable(),  // ISO string or null
        breakMins: z.number().int().min(0).max(480),
        regularHours: z.number().min(0),
        overtimeHours: z.number().min(0),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const line = await ctx.prisma.timesheetLine.findUnique({
        where: { id: input.lineId },
        include: { timesheet: true },
      });
      if (!line) throw new Error("Timesheet line not found");
      if (line.timesheet.status === "LOCKED")
        throw new Error("Cannot edit a locked timesheet");

      await ctx.prisma.timesheetLine.update({
        where: { id: input.lineId },
        data: {
          clockInTime: input.clockInTime ? new Date(input.clockInTime) : null,
          clockOutTime: input.clockOutTime ? new Date(input.clockOutTime) : null,
          breakMins: input.breakMins,
          regularHours: input.regularHours,
          overtimeHours: input.overtimeHours,
          note: input.note ?? null,
        },
      });

      // Recalculate timesheet totals
      const allLines = await ctx.prisma.timesheetLine.findMany({
        where: { timesheetId: line.timesheetId },
      });
      const totalRegularHours = allLines.reduce((s, l) => s + l.regularHours, 0);
      const totalOvertimeHours = allLines.reduce((s, l) => s + l.overtimeHours, 0);

      return ctx.prisma.timesheet.update({
        where: { id: line.timesheetId },
        data: { totalRegularHours, totalOvertimeHours },
      });
    }),

  // ── Manager: read-only view (only SA_APPROVED timesheets) ───────────────
  managerList: orgAdminProcedure
    .input(
      z.object({
        weekStart: z.string().optional(),
        siteId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Prisma.TimesheetWhereInput = {
        status: "SA_APPROVED",
        user: { organisationId: ctx.session.organisationId },
      };
      if (input.weekStart) where.weekStarting = new Date(input.weekStart);
      if (input.siteId) where.siteId = input.siteId;

      return ctx.prisma.timesheet.findMany({
        where,
        include: TIMESHEET_INCLUDE,
        orderBy: { weekStarting: "desc" },
      });
    }),
});
