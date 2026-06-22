import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, orgAdminProcedure } from "../trpc";
import {
  fetchXeroAccounts,
  pushInvoiceToXero,
  syncInvoiceStatus,
} from "../lib/xero";

export const xeroRouter = router({
  /** Current org's Xero connection (null if not connected). */
  getConnection: orgAdminProcedure.query(async ({ ctx }) => {
    const conn = await ctx.prisma.xeroConnection.findUnique({
      where: { organisationId: ctx.session.organisationId },
    });
    if (!conn) return null;
    return {
      id: conn.id,
      tenantName: conn.tenantName,
      isActive: conn.isActive,
      lastSyncAt: conn.lastSyncAt,
      invoicePrefix: conn.invoicePrefix,
      paymentTerms: conn.paymentTerms,
      taxType: conn.taxType,
      autoPush: conn.autoPush,
      createdAt: conn.createdAt,
    };
  }),

  disconnect: orgAdminProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.xeroConnection.deleteMany({
      where: { organisationId: ctx.session.organisationId },
    });
    return { ok: true };
  }),

  /** Fetch the chart of accounts from Xero. */
  getXeroAccounts: orgAdminProcedure.query(async ({ ctx }) => {
    try {
      return await fetchXeroAccounts(ctx.session.organisationId);
    } catch (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err instanceof Error ? err.message : "Failed to fetch accounts",
      });
    }
  }),

  getNominalMappings: orgAdminProcedure.query(async ({ ctx }) => {
    return ctx.prisma.xeroNominalMapping.findMany({
      where: { organisationId: ctx.session.organisationId },
    });
  }),

  saveNominalMappings: orgAdminProcedure
    .input(
      z.object({
        mappings: z.array(
          z.object({
            serviceTypeId: z.string(),
            xeroAccountCode: z.string(),
            xeroAccountId: z.string().nullish(),
            xeroAccountName: z.string().nullish(),
            taxType: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      for (const m of input.mappings) {
        if (!m.xeroAccountCode.trim()) {
          await ctx.prisma.xeroNominalMapping.deleteMany({
            where: {
              organisationId: ctx.session.organisationId,
              serviceTypeId: m.serviceTypeId,
            },
          });
          continue;
        }
        await ctx.prisma.xeroNominalMapping.upsert({
          where: {
            organisationId_serviceTypeId: {
              organisationId: ctx.session.organisationId,
              serviceTypeId: m.serviceTypeId,
            },
          },
          update: {
            xeroAccountCode: m.xeroAccountCode.trim(),
            xeroAccountId: m.xeroAccountId ?? null,
            xeroAccountName: m.xeroAccountName ?? null,
            taxType: m.taxType ?? "OUTPUT2",
          },
          create: {
            organisationId: ctx.session.organisationId,
            serviceTypeId: m.serviceTypeId,
            xeroAccountCode: m.xeroAccountCode.trim(),
            xeroAccountId: m.xeroAccountId ?? null,
            xeroAccountName: m.xeroAccountName ?? null,
            taxType: m.taxType ?? "OUTPUT2",
          },
        });
      }
      return { ok: true };
    }),

  updateInvoiceSettings: orgAdminProcedure
    .input(
      z.object({
        invoicePrefix: z.string().max(10),
        paymentTerms: z.number().int().refine((n) => [7, 14, 30].includes(n)),
        taxType: z.string(),
        autoPush: z.enum(["generated", "approved", "manual"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conn = await ctx.prisma.xeroConnection.findUnique({
        where: { organisationId: ctx.session.organisationId },
      });
      if (!conn) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connect Xero before changing invoice settings.",
        });
      }
      return ctx.prisma.xeroConnection.update({
        where: { organisationId: ctx.session.organisationId },
        data: {
          invoicePrefix: input.invoicePrefix,
          paymentTerms: input.paymentTerms,
          taxType: input.taxType,
          autoPush: input.autoPush,
        },
      });
    }),

  pushInvoice: orgAdminProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          organisationId: ctx.session.organisationId,
        },
      });
      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }
      try {
        return await pushInvoiceToXero(input.invoiceId);
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Failed to push invoice",
        });
      }
    }),

  syncInvoiceStatus: orgAdminProcedure
    .input(z.object({ invoiceId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.prisma.invoice.findFirst({
        where: {
          id: input.invoiceId,
          organisationId: ctx.session.organisationId,
        },
      });
      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }
      try {
        await syncInvoiceStatus(input.invoiceId);
        return { ok: true };
      } catch (err) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err instanceof Error ? err.message : "Failed to sync status",
        });
      }
    }),
});
