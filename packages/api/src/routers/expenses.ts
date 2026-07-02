import { z } from "zod";
import { router, protectedProcedure, orgAdminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

function currentWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export const expensesRouter = router({
  /**
   * Valeter: submit a receipt / expense claim.
   * Attached to current week's wages.
   */
  submit: protectedProcedure
    .input(
      z.object({
        description: z.string().min(3, "Please describe what the receipt is for"),
        amountPence: z.number().int().positive("Amount must be greater than 0"),
        receiptFileUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.userId;
      const siteId = ctx.session.siteId ?? undefined;

      return ctx.prisma.valeterExpense.create({
        data: {
          userId,
          siteId: siteId ?? null,
          description: input.description,
          amountPence: input.amountPence,
          receiptFileUrl: input.receiptFileUrl ?? null,
          weekStarting: currentWeekStart(),
          status: "PENDING",
        },
      });
    }),

  /**
   * Valeter: list their own expense claims.
   */
  myExpenses: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.valeterExpense.findMany({
      where: { userId: ctx.session.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        description: true,
        amountPence: true,
        receiptFileUrl: true,
        weekStarting: true,
        status: true,
        reviewNote: true,
        createdAt: true,
      },
    });
  }),

  /**
   * HQ: list all pending expense claims for review.
   */
  listPending: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.valeterExpense.findMany({
      where: {
        user: { organisationId: ctx.session.organisationId },
        status: "PENDING",
      },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            site: { select: { name: true } },
          },
        },
      },
    });
  }),

  /**
   * HQ: list all expense claims (any status) — for reports.
   */
  listAll: orgAdminProcedure
    .input(
      z.object({
        weekStarting: z.string().optional(), // ISO date string filter
      }),
    )
    .query(async ({ ctx, input }) => {
      const weekFilter = input.weekStarting ? new Date(input.weekStarting) : undefined;
      return ctx.prisma.valeterExpense.findMany({
        where: {
          user: { organisationId: ctx.session.organisationId },
          ...(weekFilter ? { weekStarting: weekFilter } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              site: { select: { name: true } },
            },
          },
        },
      });
    }),

  /**
   * HQ: approve an expense claim.
   */
  approve: orgAdminProcedure
    .input(z.object({ expenseId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const expense = await ctx.prisma.valeterExpense.findFirst({
        where: {
          id: input.expenseId,
          user: { organisationId: ctx.session.organisationId },
        },
      });
      if (!expense) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.valeterExpense.update({
        where: { id: input.expenseId },
        data: {
          status: "APPROVED",
          reviewedByUserId: ctx.session.userId,
          reviewedAt: new Date(),
        },
      });
    }),

  /**
   * HQ: reject an expense claim with a reason.
   */
  reject: orgAdminProcedure
    .input(z.object({ expenseId: z.string(), note: z.string().min(5) }))
    .mutation(async ({ ctx, input }) => {
      const expense = await ctx.prisma.valeterExpense.findFirst({
        where: {
          id: input.expenseId,
          user: { organisationId: ctx.session.organisationId },
        },
      });
      if (!expense) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.valeterExpense.update({
        where: { id: input.expenseId },
        data: {
          status: "REJECTED",
          reviewedByUserId: ctx.session.userId,
          reviewedAt: new Date(),
          reviewNote: input.note,
        },
      });
    }),
});
