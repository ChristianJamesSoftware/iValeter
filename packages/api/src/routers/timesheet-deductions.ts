import { z } from "zod";
import { router, orgAdminProcedure, protectedProcedure } from "../trpc";

/**
 * Timesheet Deductions router
 *
 * Deductions are applied post-customer-approval and reduce the valeter's finalPay.
 * Types: DAILY (agreed daily), ACCIDENT (excess recovery), UNIFORM, STANDING, OTHER
 * finalPay = grossPay - sum(amountPence)
 *
 * Ops/SA can add or remove deductions at any point before the PayRun is locked.
 * The dealer-facing timesheet shows the gross only (never internal pay figures).
 */
export const timesheetDeductionsRouter = router({

  /** Get all deductions for a timesheet, plus computed finalPay */
  listForTimesheet: orgAdminProcedure
    .input(z.object({ timesheetId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [deductions, timesheet] = await Promise.all([
        ctx.prisma.timesheetDeduction.findMany({
          where: { timesheetId: input.timesheetId },
          include: {
            addedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: "asc" },
        }),
        ctx.prisma.timesheet.findFirst({
          where: {
            id: input.timesheetId,
            site: { organisationId: ctx.session.organisationId },
          },
          include: {
            user: {
              select: {
                id: true, firstName: true, lastName: true,
                dailyRate: true, payId: true,
              },
            },
            lines: { select: { date: true, regularHours: true, overtimeHours: true } },
          },
        }),
      ]);

      if (!timesheet) throw new Error("Timesheet not found");

      // Gross = day rate × days worked (lines with clock data > 0 hours)
      // dailyRate is stored in £ on User; convert to pence for consistency
      const daysWorked = timesheet.lines.filter(
        (l: { regularHours: number; overtimeHours: number }) => l.regularHours > 0 || l.overtimeHours > 0
      ).length;
      const dailyRate = timesheet.user.dailyRate ?? 0;
      const grossPence = Math.round(daysWorked * dailyRate * 100);

      // EXPENSE lines are reimbursements — they add to net pay rather than deduct
      const expenseLines = deductions.filter((d) => d.type === "EXPENSE");
      const deductionLines = deductions.filter((d) => d.type !== "EXPENSE");

      const totalDeductionPence = deductionLines.reduce((sum, d) => sum + d.amountPence, 0);
      const totalExpenseReimbursementPence = expenseLines.reduce((sum, d) => sum + d.amountPence, 0);
      const finalPayPence = Math.max(0, grossPence - totalDeductionPence + totalExpenseReimbursementPence);

      return {
        deductions,
        expenseLines,
        deductionLines,
        grossPence,
        totalDeductionPence,
        totalExpenseReimbursementPence,
        finalPayPence,
        daysWorked,
        dayRatePence: Math.round(dailyRate * 100),
        valeter: timesheet.user,
        timesheetStatus: timesheet.status,
      };
    }),

  /** Add a deduction to a timesheet */
  add: orgAdminProcedure
    .input(z.object({
      timesheetId:       z.string(),
      type:              z.enum(["DAILY", "ACCIDENT", "UNIFORM", "STANDING", "OTHER"]),
      description:       z.string().min(1).max(200),
      amountPence:       z.number().int().positive(),
      accidentId:        z.string().optional(),
      valeterDeductionId: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify the timesheet belongs to this org
      const ts = await ctx.prisma.timesheet.findFirst({
        where: {
          id: input.timesheetId,
          site: { organisationId: ctx.session.organisationId },
        },
        select: { id: true, status: true },
      });
      if (!ts) throw new Error("Timesheet not found");

      return ctx.prisma.timesheetDeduction.create({
        data: {
          timesheetId:        input.timesheetId,
          type:               input.type,
          description:        input.description.trim(),
          amountPence:        input.amountPence,
          accidentId:         input.accidentId ?? null,
          valeterDeductionId: input.valeterDeductionId ?? null,
          addedByUserId:      ctx.session.userId,
        },
        include: {
          addedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    }),

  /** Remove a deduction */
  remove: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ded = await ctx.prisma.timesheetDeduction.findFirst({
        where: {
          id: input.id,
          timesheet: { site: { organisationId: ctx.session.organisationId } },
        },
        select: { id: true },
      });
      if (!ded) throw new Error("Deduction not found");
      return ctx.prisma.timesheetDeduction.delete({ where: { id: input.id } });
    }),

  /**
   * Bulk list deductions across multiple timesheets (for site summary view).
   * Returns map of timesheetId -> { totalDeductionPence, finalPayPence }
   */
  summaryForSite: orgAdminProcedure
    .input(z.object({
      timesheetIds: z.array(z.string()),
    }))
    .query(async ({ ctx, input }) => {
      if (input.timesheetIds.length === 0) return {};

      const [deductions, timesheets] = await Promise.all([
        ctx.prisma.timesheetDeduction.findMany({
          where: { timesheetId: { in: input.timesheetIds } },
          select: { timesheetId: true, amountPence: true },
        }),
        ctx.prisma.timesheet.findMany({
          where: { id: { in: input.timesheetIds } },
          select: {
            id: true,
            user: { select: { dailyRate: true } },
            lines: { select: { regularHours: true, overtimeHours: true } },
          },
        }),
      ]);

      const result: Record<string, { totalDeductionPence: number; grossPence: number; finalPayPence: number }> = {};

      for (const ts of timesheets) {
        const daysWorked = ts.lines.filter(
          (l: { regularHours: number; overtimeHours: number }) => l.regularHours > 0 || l.overtimeHours > 0
        ).length;
        const dailyRate = ts.user.dailyRate ?? 0;
        const grossPence = Math.round(daysWorked * dailyRate * 100);
        const totalDeductionPence = deductions
          .filter((d) => d.timesheetId === ts.id)
          .reduce((sum, d) => sum + d.amountPence, 0);
        result[ts.id] = {
          grossPence,
          totalDeductionPence,
          finalPayPence: Math.max(0, grossPence - totalDeductionPence),
        };
      }

      return result;
    }),
});
