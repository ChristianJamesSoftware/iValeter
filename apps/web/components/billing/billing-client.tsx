"use client";

import { trpc } from "@/lib/trpc/react";

function formatGbp(amount: number, currency: string) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(amount);
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function BillingClient() {
  const utils = trpc.useUtils();
  const invoices = trpc.invoices.list.useQuery();
  const features = trpc.orgSettings.getFeatures.useQuery();
  const xeroEnabled = features.data?.enabled.xero ?? false;

  const push = trpc.xero.pushInvoice.useMutation({
    onSuccess: () => utils.invoices.list.invalidate(),
  });
  const sync = trpc.xero.syncInvoiceStatus.useMutation({
    onSuccess: () => utils.invoices.list.invalidate(),
  });

  if (invoices.isLoading) {
    return <p className="text-slate">Loading invoices…</p>;
  }
  const rows = invoices.data ?? [];

  if (rows.length === 0) {
    return <p className="text-slate">No invoices yet.</p>;
  }

  return (
    <div className="space-y-3">
      {push.error && <p className="text-sm text-danger">{push.error.message}</p>}
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-slate">
              <th className="px-4 py-3 font-medium">Period</th>
              <th className="px-4 py-3 font-medium">Site</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {xeroEnabled && <th className="px-4 py-3 font-medium">Xero</th>}
              {xeroEnabled && <th className="px-4 py-3 font-medium" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((inv) => (
              <tr key={inv.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 text-navy">
                  {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                </td>
                <td className="px-4 py-3 text-slate">{inv.siteName ?? "All sites"}</td>
                <td className="px-4 py-3 font-medium text-navy">
                  {formatGbp(inv.totalAmount, inv.currency)}
                </td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-offwhite px-2.5 py-1 text-xs font-semibold text-navy">
                    {inv.status}
                  </span>
                </td>
                {xeroEnabled && (
                  <td className="px-4 py-3 text-slate">
                    {inv.xeroInvoiceNumber ? (
                      <span className="font-mono">
                        {inv.xeroInvoiceNumber} ({inv.xeroStatus})
                      </span>
                    ) : (
                      <span className="text-slate/60">Not pushed</span>
                    )}
                  </td>
                )}
                {xeroEnabled && (
                  <td className="px-4 py-3 text-right">
                    {inv.xeroInvoiceId ? (
                      <button
                        type="button"
                        onClick={() => sync.mutate({ invoiceId: inv.id })}
                        disabled={sync.isPending}
                        className="h-9 rounded-lg border border-line px-3 font-semibold text-navy transition hover:bg-offwhite disabled:opacity-60"
                      >
                        Sync status
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => push.mutate({ invoiceId: inv.id })}
                        disabled={push.isPending}
                        className="h-9 rounded-lg px-3 font-semibold text-white transition disabled:opacity-60"
                        style={{ backgroundColor: "#1AB4D7" }}
                      >
                        Push to Xero
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
