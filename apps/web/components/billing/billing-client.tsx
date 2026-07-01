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
  const invoices = trpc.invoices.list.useQuery({});
  const features = trpc.orgSettings.getFeatures.useQuery({});
  const xeroEnabled = features.data?.enabled.xero ?? false;

  const push = trpc.xero.pushInvoice.useMutation({
    onSuccess: () => utils.invoices.list.invalidate(),
  });
  const sync = trpc.xero.syncInvoiceStatus.useMutation({
    onSuccess: () => utils.invoices.list.invalidate(),
  });

  if (invoices.isLoading) {
    return <p className="text-slate-400">Loading invoices…</p>;
  }
  const rows = invoices.data ?? [];

  const thCls =
    "bg-slate-50 px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400";
  const tdCls = "border-b border-slate-50 px-5 py-4 text-sm text-slate-700";

  return (
    <div className="space-y-3">
      {push.error && (
        <p className="text-sm text-red-500">{push.error.message}</p>
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Invoices
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {rows.length}
            </span>
          </h2>
        </div>
        {rows.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-slate-400">
            No invoices yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={thCls}>Period</th>
                  <th className={thCls}>Site</th>
                  <th className={thCls}>Amount</th>
                  <th className={thCls}>Status</th>
                  {xeroEnabled && <th className={thCls}>Xero</th>}
                  {xeroEnabled && <th className={thCls} />}
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => (
                  <tr
                    key={inv.id}
                    className="last:border-0 hover:bg-slate-50/50"
                  >
                    <td className={`${tdCls} font-medium text-slate-900`}>
                      {formatDate(inv.periodStart)} – {formatDate(inv.periodEnd)}
                    </td>
                    <td className={`${tdCls} text-slate-600`}>
                      {inv.siteName ?? "All sites"}
                    </td>
                    <td className={`${tdCls} font-semibold text-slate-900`}>
                      {formatGbp(inv.totalAmount, inv.currency)}
                    </td>
                    <td className={tdCls}>
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                        {inv.status}
                      </span>
                    </td>
                    {xeroEnabled && (
                      <td className={`${tdCls} text-slate-600`}>
                        {inv.xeroInvoiceNumber ? (
                          <span className="font-mono">
                            {inv.xeroInvoiceNumber} ({inv.xeroStatus})
                          </span>
                        ) : (
                          <span className="text-slate-400">Not pushed</span>
                        )}
                      </td>
                    )}
                    {xeroEnabled && (
                      <td className={`${tdCls} text-right`}>
                        {inv.xeroInvoiceId ? (
                          <button
                            type="button"
                            onClick={() => sync.mutate({ invoiceId: inv.id })}
                            disabled={sync.isPending}
                            className="h-9 rounded-lg border border-slate-200 px-3 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
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
        )}
      </div>
    </div>
  );
}
