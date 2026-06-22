import { router, orgAdminProcedure } from "../trpc";

interface InvoiceLineItem {
  description?: string;
  quantity?: number;
  unitAmount?: number;
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
      lineItems: (inv.lineItems as InvoiceLineItem[]) ?? [],
      xeroInvoiceId: inv.xeroInvoiceId,
      xeroInvoiceNumber: inv.xeroInvoiceNumber,
      xeroStatus: inv.xeroStatus,
      pushedToXeroAt: inv.pushedToXeroAt,
    }));
  }),
});
