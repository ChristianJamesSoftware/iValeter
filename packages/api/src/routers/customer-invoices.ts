/**
 * customer-invoices router
 *
 * Manages CustomerInvoice records — the invoices raised to dealerships
 * for valeting services at their sites.
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, orgAdminProcedure, superAdminProcedure } from "../trpc";

export const customerInvoicesRouter = router({
  /** List all customer invoices for the org */
  list: orgAdminProcedure
    .input(
      z.object({
        siteId: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().int().min(1).max(200).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {
        organisationId: ctx.session.organisationId,
      };
      if (input.siteId) where.siteId = input.siteId;
      if (input.status) where.status = input.status;

      const items = await ctx.prisma.customerInvoice.findMany({
        where,
        include: {
          site: { select: { id: true, name: true } },
          lineItems: true,
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        nextCursor = items.pop()!.id;
      }

      return { items, nextCursor };
    }),

  /** Get a single invoice with line items */
  get: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const inv = await ctx.prisma.customerInvoice.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
        include: {
          site: { select: { id: true, name: true, dealership: { select: { name: true, contactEmail: true } } } },
          lineItems: true,
        },
      });
      if (!inv) throw new TRPCError({ code: "NOT_FOUND" });
      return inv;
    }),

  /** Create a new draft customer invoice */
  create: superAdminProcedure
    .input(
      z.object({
        siteId: z.string(),
        periodStart: z.string(),
        periodEnd: z.string(),
        billingCycle: z.enum(["WEEKLY", "MONTHLY"]),
        paymentTerms: z.enum(["NET14", "MONTH_END", "MONTH_END_PLUS1"]),
        dueDate: z.string(),
        lineItems: z.array(
          z.object({
            description: z.string().min(1),
            quantity: z.number(),
            unitAmount: z.number(),
            serviceType: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const totalAmount = input.lineItems.reduce(
        (sum, l) => sum + l.quantity * l.unitAmount,
        0,
      );

      return ctx.prisma.customerInvoice.create({
        data: {
          organisationId: ctx.session.organisationId,
          siteId: input.siteId,
          periodStart: new Date(input.periodStart),
          periodEnd: new Date(input.periodEnd),
          billingCycle: input.billingCycle,
          paymentTerms: input.paymentTerms,
          dueDate: new Date(input.dueDate),
          totalAmount,
          status: "DRAFT",
          lineItems: {
            create: input.lineItems.map((l) => ({
              description: l.description,
              quantity: l.quantity,
              unitAmount: l.unitAmount,
              totalAmount: l.quantity * l.unitAmount,
              serviceType: l.serviceType ?? null,
            })),
          },
        },
        include: { lineItems: true },
      });
    }),

  /** Update invoice status */
  updateStatus: superAdminProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["DRAFT", "SENT", "ACCEPTED", "DISPUTED", "PAID", "OVERDUE"]),
        issuedAt: z.string().optional(),
        paidAt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await ctx.prisma.customerInvoice.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!inv) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.customerInvoice.update({
        where: { id: input.id },
        data: {
          status: input.status,
          ...(input.status === "SENT" ? { issuedAt: new Date() } : {}),
          ...(input.status === "PAID" ? { paidAt: new Date() } : {}),
          ...(input.issuedAt ? { issuedAt: new Date(input.issuedAt) } : {}),
          ...(input.paidAt ? { paidAt: new Date(input.paidAt) } : {}),
        },
      });
    }),

  /** Delete a DRAFT invoice */
  delete: superAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const inv = await ctx.prisma.customerInvoice.findFirst({
        where: { id: input.id, organisationId: ctx.session.organisationId },
      });
      if (!inv) throw new TRPCError({ code: "NOT_FOUND" });
      if (inv.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Only DRAFT invoices can be deleted." });
      }
      return ctx.prisma.customerInvoice.delete({ where: { id: input.id } });
    }),

  /** Summary stats */
  stats: orgAdminProcedure.query(async ({ ctx }) => {
    const [draft, sent, paid, overdue] = await Promise.all([
      ctx.prisma.customerInvoice.aggregate({
        where: { organisationId: ctx.session.organisationId, status: "DRAFT" },
        _count: true, _sum: { totalAmount: true },
      }),
      ctx.prisma.customerInvoice.aggregate({
        where: { organisationId: ctx.session.organisationId, status: "SENT" },
        _count: true, _sum: { totalAmount: true },
      }),
      ctx.prisma.customerInvoice.aggregate({
        where: { organisationId: ctx.session.organisationId, status: "PAID" },
        _count: true, _sum: { totalAmount: true },
      }),
      ctx.prisma.customerInvoice.aggregate({
        where: { organisationId: ctx.session.organisationId, status: "OVERDUE" },
        _count: true, _sum: { totalAmount: true },
      }),
    ]);
    return { draft, sent, paid, overdue };
  }),
});
