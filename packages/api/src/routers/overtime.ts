import { z } from "zod";
import { router, protectedProcedure, orgAdminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const overtimeRouter = router({
  /** Valeter: submit an overtime request */
  request: protectedProcedure
    .input(
      z.object({
        requestedDate: z.string(), // ISO date string
        requestedHours: z.number().min(0.5).max(12),
        reason: z.string().min(1).max(500),
        reasonId: z.string().optional(), // links to a managed OvertimeReason
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.overtimeRequest.create({
        data: {
          userId: ctx.session.userId,
          organisationId: ctx.session.organisationId,
          siteId: ctx.session.siteId,
          requestedDate: new Date(input.requestedDate),
          requestedHours: input.requestedHours,
          reason: input.reason,
          reasonId: input.reasonId ?? null,
          status: "PENDING",
        },
      });
    }),

  /** Valeter: my overtime request history */
  myRequests: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.overtimeRequest.findMany({
      where: { userId: ctx.session.userId },
      orderBy: { createdAt: "desc" },
    });
  }),

  /** HQ: list all pending overtime requests */
  listPending: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.overtimeRequest.findMany({
      where: { organisationId: ctx.session.organisationId, status: "PENDING" },
      include: {
        user: { select: { firstName: true, lastName: true, payId: true, site: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  /** HQ: approve or decline an overtime request.
   * On APPROVED: find-or-create the valeter's timesheet for that week,
   * then upsert a TimesheetLine for that date with the overtime hours.
   */
  review: orgAdminProcedure
    .input(
      z.object({
        requestId: z.string(),
        action: z.enum(["APPROVED", "DECLINED"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const req = await ctx.prisma.overtimeRequest.findFirst({
        where: { id: input.requestId, organisationId: ctx.session.organisationId },
        include: { user: { select: { siteId: true } } },
      });
      if (!req) throw new TRPCError({ code: "NOT_FOUND" });

      // Update the request status
      const updated = await ctx.prisma.overtimeRequest.update({
        where: { id: input.requestId },
        data: {
          status: input.action,
          reviewedByUserId: ctx.session.userId,
          reviewedAt: new Date(),
        },
      });

      // On approval — write hours into the valeter's timesheet
      if (input.action === "APPROVED") {
        const date = new Date(req.requestedDate);
        date.setHours(0, 0, 0, 0);

        // Calc Monday of that week
        const day = date.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const siteId = req.siteId ?? req.user.siteId;
        if (!siteId) throw new TRPCError({ code: "BAD_REQUEST", message: "Valeter has no site" });

        // Find or create the timesheet for that week
        let timesheet = await ctx.prisma.timesheet.findUnique({
          where: { userId_weekStarting: { userId: req.userId, weekStarting: weekStart } },
        });
        if (!timesheet) {
          timesheet = await ctx.prisma.timesheet.create({
            data: {
              userId: req.userId,
              siteId,
              weekStarting: weekStart,
              weekEnding: weekEnd,
              status: "DRAFT",
            },
          });
        }

        // Find existing line for that date, or create one
        const existingLine = await ctx.prisma.timesheetLine.findFirst({
          where: { timesheetId: timesheet.id, date },
        });

        if (existingLine) {
          // Add to any existing overtime hours on that day
          await ctx.prisma.timesheetLine.update({
            where: { id: existingLine.id },
            data: {
              overtimeHours: existingLine.overtimeHours + req.requestedHours,
              overtimeRequestId: req.id,
              note: existingLine.note
                ? `${existingLine.note}; OT: ${req.reason}`
                : `OT approved: ${req.reason}`,
            },
          });
        } else {
          await ctx.prisma.timesheetLine.create({
            data: {
              timesheetId: timesheet.id,
              date,
              overtimeHours: req.requestedHours,
              overtimeRequestId: req.id,
              note: `OT approved: ${req.reason}`,
            },
          });
        }

        // Keep timesheet totals in sync
        const lines = await ctx.prisma.timesheetLine.findMany({
          where: { timesheetId: timesheet.id },
        });
        const totalOT = lines.reduce((s, l) => s + l.overtimeHours, 0);
        const totalReg = lines.reduce((s, l) => s + l.regularHours, 0);
        await ctx.prisma.timesheet.update({
          where: { id: timesheet.id },
          data: { totalOvertimeHours: totalOT, totalRegularHours: totalReg },
        });
      }

      return updated;
    }),
});
