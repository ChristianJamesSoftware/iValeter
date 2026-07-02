import { z } from "zod";
import { router, superAdminProcedure, orgAdminProcedure } from "../trpc";

/**
 * Valeter Deductions router
 *
 * Handles uniform costs, equipment charges, etc. that are recovered weekly.
 * Ops team creates a deduction specifying total cost + weekly recovery amount.
 * Payroll picks up active (non-settled) deductions each week.
 */
export const valeterDeductionsRouter = router({

  /** List all deductions for a valeter */
  listForValeter: superAdminProcedure
    .input(z.object({ valeterId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.valeterDeduction.findMany({
        where: { valeterId: input.valeterId },
        orderBy: { createdAt: "desc" },
      });
    }),

  /** Create a new deduction (e.g. uniform cost) */
  create: orgAdminProcedure
    .input(z.object({
      valeterId:    z.string(),
      description:  z.string().min(1),
      totalAmount:  z.number().positive(),
      weeklyAmount: z.number().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify valeter belongs to this org
      const valeter = await ctx.prisma.user.findFirst({
        where: { id: input.valeterId, organisationId: ctx.session.organisationId },
        select: { id: true },
      });
      if (!valeter) throw new Error("Valeter not found in your organisation");

      return ctx.prisma.valeterDeduction.create({
        data: {
          valeterId:    input.valeterId,
          description:  input.description.trim(),
          totalAmount:  input.totalAmount,
          weeklyAmount: input.weeklyAmount,
          totalDeducted: 0,
          settled: false,
        },
      });
    }),

  /** Record a weekly payment against a deduction (called by payroll) */
  applyWeeklyDeduction: orgAdminProcedure
    .input(z.object({
      id:     z.string(),
      amount: z.number().positive(), // usually == weeklyAmount, but can be partial
    }))
    .mutation(async ({ ctx, input }) => {
      const ded = await ctx.prisma.valeterDeduction.findFirst({
        where: { id: input.id, valeter: { organisationId: ctx.session.organisationId } },
      });
      if (!ded) throw new Error("Deduction not found");

      const newTotal = ded.totalDeducted + input.amount;
      const settled  = newTotal >= ded.totalAmount;

      return ctx.prisma.valeterDeduction.update({
        where: { id: input.id },
        data: {
          totalDeducted: Math.min(newTotal, ded.totalAmount),
          settled,
        },
      });
    }),

  /** Manually mark settled (e.g. waived or paid off early) */
  settle: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ded = await ctx.prisma.valeterDeduction.findFirst({
        where: { id: input.id, valeter: { organisationId: ctx.session.organisationId } },
      });
      if (!ded) throw new Error("Deduction not found");
      return ctx.prisma.valeterDeduction.update({
        where: { id: input.id },
        data: { settled: true },
      });
    }),

  /** Delete a deduction (only if not yet started) */
  remove: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const ded = await ctx.prisma.valeterDeduction.findFirst({
        where: { id: input.id, valeter: { organisationId: ctx.session.organisationId } },
      });
      if (!ded) throw new Error("Deduction not found");
      if (ded.totalDeducted > 0) throw new Error("Cannot delete a deduction with payments already applied");
      return ctx.prisma.valeterDeduction.delete({ where: { id: input.id } });
    }),
});
