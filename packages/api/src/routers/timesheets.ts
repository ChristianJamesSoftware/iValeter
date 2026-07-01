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
