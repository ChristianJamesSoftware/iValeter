/**
 * Customer Invoices Router
 *
 * Handles the new per-site, per-period CustomerInvoice model (distinct from
 * the legacy Invoice model which was a JSON blob).
 *
 * Weekly cycle: invoices are generated every Monday for the previous week.
 * Monthly cycle: generated on the 1st for the previous calendar month.
 *
 * Payment terms per site: NET14, MONTH_END, MONTH_END_PLUS1.
 *
 * Xero integration: approved invoices are pushed via the xeroRouter.
 * This router manages lifecycle up to the push; xeroRouter handles OAuth.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  BillingCycle,
  CustomerInvoiceStatus,
  PaymentTerms,
} from "@ivaleter/db";
import {
  router,
  orgAdminProcedure,
  dealershipProcedure,
} from "../trpc";

// ─── Due Date Helpers ─────────────────────────────────────────────────────────

/**
 * Calculate the invoice due date based on issue date and payment terms.
 *
 * NET14          → issueDate + 14 days
 * MONTH_END      → last day of the month in which issueDate falls
 * MONTH_END_PLUS1 → last day of the month AFTER issueDate
 */
function calculateDueDate(issueDate: Date, terms: PaymentTerms): Date {
  const d = new Date(issueDate);

  switch (terms) {
    case PaymentTerms.NET14: {
      d.setUTCDate(d.getUTCDate() + 14);
      return d;
    }
    case PaymentTerms.MONTH_END: {
      // Last day of the current month
      d.setUTCMonth(d.getUTCMonth() + 1, 0);
      d.setUTCHours(23, 59, 59, 999);
      return d;
    }
    case PaymentTerms.MONTH_END_PLUS1: {
      // Last day of the following month
      d.setUTCMonth(d.getUTCMonth() + 2, 0);
      d.setUTCHours(23, 59, 59, 999);
      return d;
    }
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const customerInvoicesRouter = router({
  // ── LIST ──────────────────────────────────────────────────────────────────

  /**
   * List invoices. Org admin sees all for their org.
   * Dealership users see invoices for their site only.
   */
  list: dealershipProcedure
    .input(
      z
        .object({
          siteId: z.string().optional(),
          status: z.nativeEnum(CustomerInvoiceStatus).optional(),
          periodFrom: z.date().optional(),
          periodTo: z.date().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const isAdmin =
        ctx.session.role === "org_admin" ||
        ctx.session.role === "super_admin";

      return ctx.prisma.customerInvoice.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          siteId: isAdmin ? input?.siteId : ctx.session.siteId ?? undefined,
          status: input?.status,
          periodStart: input?.periodFrom
            ? { gte: input.periodFrom }
            : undefined,
          periodEnd: input?.periodTo ? { lte: input.periodTo } : undefined,
        },
        include: {
          site: { select: { id: true, name: true } },
          _count: { select: { lineItems: true } },
        },
        orderBy: { periodStart: "desc" },
      });
    }),

  // ── GET BY ID ─────────────────────────────────────────────────────────────

  getById: dealershipProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const isAdmin =
        ctx.session.role === "org_admin" ||
        ctx.session.role === "super_admin";

      const invoice = await ctx.prisma.customerInvoice.findFirst({
        where: {
          id: input.id,
          organisationId: ctx.session.organisationId,
          ...(isAdmin ? {} : { siteId: ctx.session.siteId ?? undefined }),
        },
        include: {
          site: { select: { id: true, name: true, xeroContactId: true } },
          lineItems: { orderBy: { id: "asc" } },
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      return invoice;
    }),

  // ── GENERATE FROM COMPLETED BOOKINGS ──────────────────────────────────────

  /**
   * Generate a CustomerInvoice for a site + period from completed bookings.
   *
   * Line items are grouped by ServiceType name. Each line shows:
   *   - Description: service type name
   *   - Quantity: number of jobs
   *   - Unit amount: chargeRate from ServiceType (or 0 if not set)
   *   - Total: quantity × unitAmount
   *
   * An existing DRAFT invoice for the same site+period will be replaced.
   */
  generate: orgAdminProcedure
    .input(
      z.object({
        siteId: z.string(),
        periodStart: z.date(),
        periodEnd: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate site belongs to org
      const site = await ctx.prisma.site.findFirst({
        where: {
          id: input.siteId,
          organisationId: ctx.session.organisationId,
        },
      });

      if (!site) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Site not found" });
      }

      // Check for existing non-DRAFT invoice for this period
      const existing = await ctx.prisma.customerInvoice.findFirst({
        where: {
          siteId: input.siteId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
        },
      });

      if (existing && existing.status !== CustomerInvoiceStatus.DRAFT) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `An invoice for this period already exists with status ${existing.status}`,
        });
      }

      // Fetch completed bookings in the period
      const bookings = await ctx.prisma.booking.findMany({
        where: {
          siteId: input.siteId,
          organisationId: ctx.session.organisationId,
          status: "COMPLETED",
          completedAt: {
            gte: input.periodStart,
            lte: input.periodEnd,
          },
        },
        include: {
          serviceType: {
            select: { name: true, chargeRate: true, nominalCode: true },
          },
        },
      });

      // Group by service type
      const grouped = new Map<
        string,
        {
          serviceType: string;
          nominalCode: string | null;
          count: number;
          unitAmount: number;
        }
      >();

      for (const b of bookings) {
        const key = b.serviceType.name;
        const entry = grouped.get(key) ?? {
          serviceType: b.serviceType.name,
          nominalCode: b.serviceType.nominalCode,
          count: 0,
          unitAmount: b.serviceType.chargeRate ?? 0,
        };
        entry.count++;
        grouped.set(key, entry);
      }

      // Build line items
      const lineItems = Array.from(grouped.values()).map((g) => ({
        description: g.serviceType,
        quantity: g.count,
        unitAmount: g.unitAmount,
        totalAmount: Math.round(g.count * g.unitAmount * 100) / 100,
        serviceType: g.serviceType,
      }));

      const totalAmount = lineItems.reduce((s, l) => s + l.totalAmount, 0);
      const issueDate = new Date();
      const dueDate = calculateDueDate(issueDate, site.paymentTerms);

      // Delete existing DRAFT if present
      if (existing) {
        await ctx.prisma.customerInvoiceLineItem.deleteMany({
          where: { invoiceId: existing.id },
        });
        await ctx.prisma.customerInvoice.delete({
          where: { id: existing.id },
        });
      }

      // Create the invoice
      const invoice = await ctx.prisma.customerInvoice.create({
        data: {
          organisationId: ctx.session.organisationId,
          siteId: input.siteId,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          billingCycle: site.billingCycle,
          paymentTerms: site.paymentTerms,
          dueDate,
          totalAmount: Math.round(totalAmount * 100) / 100,
          status: CustomerInvoiceStatus.DRAFT,
          lineItems: {
            createMany: { data: lineItems },
          },
        },
        include: {
          lineItems: true,
          site: { select: { name: true } },
        },
      });

      return invoice;
    }),

  // ── BATCH GENERATE (Monday cron) ──────────────────────────────────────────

  /**
   * Generate invoices for ALL active sites in the org for the previous period.
   * Weekly sites: previous Mon–Sun. Monthly sites: previous calendar month.
   * Called by a Monday-morning cron job.
   * Returns a summary of created invoices.
   */
  batchGenerate: orgAdminProcedure
    .input(
      z.object({
        /** The date to run from — normally today (Monday). */
        asOf: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sites = await ctx.prisma.site.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          isActive: true,
        },
      });

      const results: {
        siteId: string;
        siteName: string;
        invoiceId: string | null;
        totalAmount: number;
        error: string | null;
      }[] = [];

      for (const site of sites) {
        try {
          let periodStart: Date;
          let periodEnd: Date;

          if (site.billingCycle === BillingCycle.WEEKLY) {
            // Previous Monday → Sunday
            const asOf = new Date(input.asOf);
            periodEnd = new Date(asOf);
            periodEnd.setUTCDate(asOf.getUTCDate() - 1); // last Sunday
            periodEnd.setUTCHours(23, 59, 59, 999);
            periodStart = new Date(periodEnd);
            periodStart.setUTCDate(periodEnd.getUTCDate() - 6);
            periodStart.setUTCHours(0, 0, 0, 0);
          } else {
            // Previous calendar month
            const asOf = new Date(input.asOf);
            periodStart = new Date(
              Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() - 1, 1),
            );
            periodEnd = new Date(
              Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), 0, 23, 59, 59, 999),
            );
          }

          // Check not already invoiced
          const existing = await ctx.prisma.customerInvoice.findFirst({
            where: {
              siteId: site.id,
              periodStart,
              periodEnd,
              status: { not: CustomerInvoiceStatus.DRAFT },
            },
          });

          if (existing) {
            results.push({
              siteId: site.id,
              siteName: site.name,
              invoiceId: existing.id,
              totalAmount: existing.totalAmount,
              error: "Already invoiced for this period",
            });
            continue;
          }

          // Count completed bookings
          const bookingCount = await ctx.prisma.booking.count({
            where: {
              siteId: site.id,
              status: "COMPLETED",
              completedAt: { gte: periodStart, lte: periodEnd },
            },
          });

          if (bookingCount === 0) {
            results.push({
              siteId: site.id,
              siteName: site.name,
              invoiceId: null,
              totalAmount: 0,
              error: "No completed jobs in period",
            });
            continue;
          }

          // Generate
          const bookings = await ctx.prisma.booking.findMany({
            where: {
              siteId: site.id,
              organisationId: ctx.session.organisationId,
              status: "COMPLETED",
              completedAt: { gte: periodStart, lte: periodEnd },
            },
            include: {
              serviceType: {
                select: { name: true, chargeRate: true, nominalCode: true },
              },
            },
          });

          const grouped = new Map<
            string,
            { count: number; unitAmount: number }
          >();
          for (const b of bookings) {
            const key = b.serviceType.name;
            const e = grouped.get(key) ?? {
              count: 0,
              unitAmount: b.serviceType.chargeRate ?? 0,
            };
            e.count++;
            grouped.set(key, e);
          }

          const lineItems = Array.from(grouped.entries()).map(
            ([name, g]) => ({
              description: name,
              quantity: g.count,
              unitAmount: g.unitAmount,
              totalAmount: Math.round(g.count * g.unitAmount * 100) / 100,
              serviceType: name,
            }),
          );

          const totalAmount =
            Math.round(
              lineItems.reduce((s, l) => s + l.totalAmount, 0) * 100,
            ) / 100;

          const issueDate = new Date();
          const dueDate = calculateDueDate(issueDate, site.paymentTerms);

          // Remove stale draft
          const staleDraft = await ctx.prisma.customerInvoice.findFirst({
            where: { siteId: site.id, periodStart, periodEnd },
          });
          if (staleDraft) {
            await ctx.prisma.customerInvoiceLineItem.deleteMany({
              where: { invoiceId: staleDraft.id },
            });
            await ctx.prisma.customerInvoice.delete({
              where: { id: staleDraft.id },
            });
          }

          const invoice = await ctx.prisma.customerInvoice.create({
            data: {
              organisationId: ctx.session.organisationId,
              siteId: site.id,
              periodStart,
              periodEnd,
              billingCycle: site.billingCycle,
              paymentTerms: site.paymentTerms,
              dueDate,
              totalAmount,
              status: CustomerInvoiceStatus.DRAFT,
              lineItems: { createMany: { data: lineItems } },
            },
          });

          results.push({
            siteId: site.id,
            siteName: site.name,
            invoiceId: invoice.id,
            totalAmount,
            error: null,
          });
        } catch (err) {
          results.push({
            siteId: site.id,
            siteName: site.name,
            invoiceId: null,
            totalAmount: 0,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }

      return {
        total: results.length,
        created: results.filter((r) => !r.error).length,
        skipped: results.filter((r) => r.error !== null).length,
        results,
      };
    }),

  // ── ISSUE (send to customer) ───────────────────────────────────────────────

  /**
   * Mark an invoice as SENT — records issuedAt.
   * The web layer handles the actual email/Xero push notification.
   */
  issue: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.customerInvoice.findFirst({
        where: {
          id: input.id,
          organisationId: ctx.session.organisationId,
          status: CustomerInvoiceStatus.DRAFT,
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found or not in DRAFT state",
        });
      }

      return ctx.prisma.customerInvoice.update({
        where: { id: invoice.id },
        data: {
          status: CustomerInvoiceStatus.SENT,
          issuedAt: new Date(),
        },
        include: { lineItems: true, site: true },
      });
    }),

  // ── RECORD XERO SYNC ──────────────────────────────────────────────────────

  /**
   * Called by the xeroRouter after successfully pushing the invoice to Xero.
   * Records the Xero invoice ID and sync timestamp.
   */
  recordXeroSync: orgAdminProcedure
    .input(
      z.object({
        id: z.string(),
        xeroInvoiceId: z.string(),
        xeroInvoiceNumber: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.customerInvoice.findFirst({
        where: {
          id: input.id,
          organisationId: ctx.session.organisationId,
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      return ctx.prisma.customerInvoice.update({
        where: { id: invoice.id },
        data: {
          xeroInvoiceId: input.xeroInvoiceId,
          xeroInvoiceNumber: input.xeroInvoiceNumber,
          xeroSyncedAt: new Date(),
          status:
            invoice.status === CustomerInvoiceStatus.DRAFT
              ? CustomerInvoiceStatus.SENT
              : invoice.status,
          issuedAt: invoice.issuedAt ?? new Date(),
        },
      });
    }),

  // ── MARK PAID ──────────────────────────────────────────────────────────────

  /** Record that a customer has paid (can be done in Xero or manually). */
  markPaid: orgAdminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.customerInvoice.findFirst({
        where: {
          id: input.id,
          organisationId: ctx.session.organisationId,
          status: {
            in: [
              CustomerInvoiceStatus.SENT,
              CustomerInvoiceStatus.ACCEPTED,
              CustomerInvoiceStatus.OVERDUE,
            ],
          },
        },
      });

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found or not in a payable state",
        });
      }

      return ctx.prisma.customerInvoice.update({
        where: { id: invoice.id },
        data: { status: CustomerInvoiceStatus.PAID, paidAt: new Date() },
      });
    }),

  // ── MARK OVERDUE (cron) ────────────────────────────────────────────────────

  /**
   * Finds all SENT/ACCEPTED invoices past their dueDate and marks them OVERDUE.
   * Called by a daily cron job.
   */
  processOverdue: orgAdminProcedure.mutation(async ({ ctx }) => {
    const now = new Date();

    const updated = await ctx.prisma.customerInvoice.updateMany({
      where: {
        organisationId: ctx.session.organisationId,
        status: {
          in: [
            CustomerInvoiceStatus.SENT,
            CustomerInvoiceStatus.ACCEPTED,
          ],
        },
        dueDate: { lt: now },
      },
      data: { status: CustomerInvoiceStatus.OVERDUE },
    });

    return { marked: updated.count };
  }),

  // ── UPDATE LINE ITEM ───────────────────────────────────────────────────────

  /** Org admin can edit a line item on a DRAFT invoice (e.g. manual adjustment). */
  updateLineItem: orgAdminProcedure
    .input(
      z.object({
        lineItemId: z.string(),
        description: z.string().optional(),
        quantity: z.number().positive().optional(),
        unitAmount: z.number().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.prisma.customerInvoiceLineItem.findFirst({
        where: {
          id: input.lineItemId,
          invoice: { organisationId: ctx.session.organisationId },
        },
        include: { invoice: true },
      });

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Line item not found",
        });
      }

      if (item.invoice.status !== CustomerInvoiceStatus.DRAFT) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Can only edit line items on a DRAFT invoice",
        });
      }

      const quantity = input.quantity ?? item.quantity;
      const unitAmount = input.unitAmount ?? item.unitAmount;
      const totalAmount = Math.round(quantity * unitAmount * 100) / 100;

      await ctx.prisma.customerInvoiceLineItem.update({
        where: { id: item.id },
        data: {
          description: input.description ?? item.description,
          quantity,
          unitAmount,
          totalAmount,
        },
      });

      // Recalculate invoice total
      const allItems = await ctx.prisma.customerInvoiceLineItem.findMany({
        where: { invoiceId: item.invoiceId },
      });
      const newTotal =
        Math.round(
          allItems.reduce(
            (s, i) => s + (i.id === item.id ? totalAmount : i.totalAmount),
            0,
          ) * 100,
        ) / 100;

      return ctx.prisma.customerInvoice.update({
        where: { id: item.invoiceId },
        data: { totalAmount: newTotal },
        include: { lineItems: true },
      });
    }),

  // ── SUMMARY (for weekly review email + dashboard) ─────────────────────────

  /** Returns invoice summary stats for a site — used by the weekly review and dashboard. */
  siteStats: dealershipProcedure
    .input(
      z.object({
        siteId: z.string(),
        periodStart: z.date(),
        periodEnd: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const isAdmin =
        ctx.session.role === "org_admin" ||
        ctx.session.role === "super_admin";

      if (!isAdmin && ctx.session.siteId !== input.siteId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      const invoices = await ctx.prisma.customerInvoice.findMany({
        where: {
          organisationId: ctx.session.organisationId,
          siteId: input.siteId,
          periodStart: { gte: input.periodStart },
          periodEnd: { lte: input.periodEnd },
        },
        include: { lineItems: true },
      });

      const totalBilled = invoices.reduce((s, i) => s + i.totalAmount, 0);
      const paid = invoices.filter(
        (i) => i.status === CustomerInvoiceStatus.PAID,
      );
      const overdue = invoices.filter(
        (i) => i.status === CustomerInvoiceStatus.OVERDUE,
      );

      return {
        invoiceCount: invoices.length,
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalPaid: Math.round(
          paid.reduce((s, i) => s + i.totalAmount, 0) * 100,
        ) / 100,
        totalOutstanding: Math.round(
          invoices
            .filter((i) => i.status !== CustomerInvoiceStatus.PAID)
            .reduce((s, i) => s + i.totalAmount, 0) * 100,
        ) / 100,
        overdueCount: overdue.length,
        overdueAmount: Math.round(
          overdue.reduce((s, i) => s + i.totalAmount, 0) * 100,
        ) / 100,
      };
    }),
});
