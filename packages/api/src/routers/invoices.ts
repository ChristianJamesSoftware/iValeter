import { z } from "zod";
import { router, orgAdminProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  nominalCode?: string;
}

export const invoicesRouter = router({
  /** All invoices for the current org, newest first. */
  list: orgAdminProcedure.query(async ({ ctx }) => {
    const invoices = await ctx.prisma.invoice.findMany({
      where: { organisationId: ctx.session.organisationId },
      orderBy: { createdAt: "desc" },
    });
    const sites = await ctx.prisma.site.findMany({
      where: { organisationId: ctx.session.organisationId },
      select: { id: true, name: true },
    });
    const siteName = new Map(sites.map((s) => [s.id, s.name]));
    return invoices.map((inv) => ({
      id: inv.id,
      siteName: inv.siteId ? (siteName.get(inv.siteId) ?? null) : null,
      periodStart: inv.periodStart,
      periodEnd: inv.periodEnd,
      status: inv.status,
      totalAmount: inv.totalAmount,
      currency: inv.currency,
      lineItems: ((inv.lineItems as unknown) as InvoiceLineItem[]) ?? [],
      xeroInvoiceId: inv.xeroInvoiceId,
      xeroInvoiceNumber: inv.xeroInvoiceNumber,
      xeroStatus: inv.xeroStatus,
      pushedToXeroAt: inv.pushedToXeroAt,
    }));
  }),

  /**
   * Generate an invoice for a site from an accepted week submission.
   *
   * Pulls:
   *  - Day-rate charges: valeters × daily rate × days worked
   *  - Approved service charges (add-ons, paint protection, etc.) for that site/week
   *
   * Creates one Invoice record per site per week. Idempotent — returns existing
   * invoice if one already exists for this site + weekStart.
   */
  generate: orgAdminProcedure
    .input(
      z.object({
        siteId: z.string(),
        weekStart: z.string(), // ISO date string e.g. "2026-09-07"
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.session.organisationId;
      const weekStartDate = new Date(input.weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6);

      // Guard: site must belong to this org
      const site = await ctx.prisma.site.findFirst({
        where: { id: input.siteId, organisationId: orgId },
        select: { id: true, name: true },
      });
      if (!site) throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });

      // Guard: submission must be accepted
      const submission = await ctx.prisma.siteWeekSubmission.findUnique({
        where: { siteId_weekStarting: { siteId: input.siteId, weekStarting: weekStartDate } },
      });
      if (!submission || !["DEALER_ACCEPTED", "AUTO_ACCEPTED"].includes(submission.status)) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Site submission must be accepted by the dealer before generating an invoice.",
        });
      }

      // Idempotency — return existing invoice if already generated
      const existing = await ctx.prisma.invoice.findFirst({
        where: { organisationId: orgId, siteId: input.siteId, periodStart: weekStartDate },
      });
      if (existing) return { invoiceId: existing.id, alreadyExisted: true };

      // ── Build line items ────────────────────────────────────────────────
      const lineItems: InvoiceLineItem[] = [];

      // 1. Day-rate charges from approved timesheets
      const timesheets = await ctx.prisma.timesheet.findMany({
        where: {
          siteId: input.siteId,
          weekStarting: weekStartDate,
          status: { in: ["SA_APPROVED", "LOCKED"] },
          user: { organisationId: orgId },
        },
        include: {
          user: { select: { firstName: true, lastName: true, dailyRate: true } },
          lines: { select: { regularHours: true, overtimeHours: true } },
        },
      });

      for (const ts of timesheets) {
        const daysWorked = ts.lines.filter(
          (l) => l.regularHours > 0 || l.overtimeHours > 0,
        ).length;
        if (daysWorked === 0) continue;

        const dailyRate = ts.user.dailyRate ?? 0;
        const name = `${ts.user.firstName} ${ts.user.lastName}`;

        if (dailyRate > 0) {
          lineItems.push({
            description: `Valeting — ${name} (${daysWorked} day${daysWorked !== 1 ? "s" : ""}) @ ${site.name}`,
            quantity: daysWorked,
            unitAmount: dailyRate,
          });
        }
      }

      // 2. Approved service charges for this site + week
      const serviceCharges = await ctx.prisma.serviceChargeRequest.findMany({
        where: {
          organisationId: orgId,
          siteId: input.siteId,
          weekStarting: weekStartDate,
          status: "APPROVED",
        },
      });

      for (const sc of serviceCharges) {
        lineItems.push({
          description: sc.description,
          quantity: 1,
          unitAmount: sc.amountPence / 100,
        });
      }

      const totalAmount = lineItems.reduce(
        (sum, li) => sum + li.quantity * li.unitAmount,
        0,
      );

      // ── Create invoice record ────────────────────────────────────────────
      const invoice = await ctx.prisma.invoice.create({
        data: {
          organisationId: orgId,
          siteId: input.siteId,
          periodStart: weekStartDate,
          periodEnd: weekEndDate,
          status: "DRAFT",
          lineItems: lineItems as object[],
          totalAmount,
          currency: "GBP",
          issuedAt: new Date(),
        },
      });

      return { invoiceId: invoice.id, alreadyExisted: false, totalAmount, lineCount: lineItems.length };
    }),

  /** Mark an invoice as sent to the customer (outside Xero). */
  markSent: orgAdminProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: input.invoiceId, organisationId: ctx.session.organisationId },
      });
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });

      return ctx.prisma.invoice.update({
        where: { id: input.invoiceId },
        data: { status: "SENT", issuedAt: invoice.issuedAt ?? new Date() },
      });
    }),

  /** Mark an invoice as paid. */
  markPaid: orgAdminProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: { id: input.invoiceId, organisationId: ctx.session.organisationId },
      });
      if (!invoice) throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });

      return ctx.prisma.invoice.update({
        where: { id: input.invoiceId },
        data: { status: "PAID", paidAt: new Date() },
      });
    }),
});
