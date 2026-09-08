"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { Landmark, CheckCircle2, Loader2, Plus, Send, CheckCheck, RefreshCw } from "lucide-react";

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

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-slate-100 text-slate-600 border-slate-200",
  SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
  AUTHORISED:"bg-purple-50 text-purple-700 border-purple-200",
  PAID:      "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function BillingClient() {
  const utils = trpc.useUtils();

  // Queries
  const invoices   = trpc.invoices.list.useQuery();
  const features   = trpc.orgSettings.getFeatures.useQuery();
  const sites      = trpc.sites.list.useQuery();
  const xeroEnabled = features.data?.enabled.xero ?? false;
  const xeroConn   = trpc.xero.getConnection.useQuery();
  const xeroAuthUrl = trpc.xero.getAuthUrl.useQuery(undefined, { enabled: xeroEnabled });

  // Generate invoice state
  const [showGenerate, setShowGenerate] = useState(false);
  const [genSiteId, setGenSiteId]       = useState("");
  const [genWeek, setGenWeek]           = useState("");
  const [genError, setGenError]         = useState<string | null>(null);

  // Mutations
  const generate   = trpc.invoices.generate.useMutation({
    onSuccess: () => {
      void utils.invoices.list.invalidate();
      setShowGenerate(false);
      setGenSiteId("");
      setGenWeek("");
      setGenError(null);
    },
    onError: (e) => setGenError(e.message),
  });
  const markSent   = trpc.invoices.markSent.useMutation({ onSuccess: () => utils.invoices.list.invalidate() });
  const markPaid   = trpc.invoices.markPaid.useMutation({ onSuccess: () => utils.invoices.list.invalidate() });
  const disconnect = trpc.xero.disconnect.useMutation({ onSuccess: () => xeroConn.refetch() });
  const push       = trpc.xero.pushInvoice.useMutation({ onSuccess: () => utils.invoices.list.invalidate() });
  const sync       = trpc.xero.syncInvoiceStatus.useMutation({ onSuccess: () => utils.invoices.list.invalidate() });

  const rows     = invoices.data ?? [];
  const siteList = sites.data ?? [];
  const isConnected = xeroConn.data?.isActive ?? false;

  const thCls = "bg-slate-50 px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400";
  const tdCls = "border-b border-slate-50 px-5 py-4 text-sm text-slate-700";

  return (
    <div className="space-y-4">

      {/* Xero connection banner */}
      {xeroEnabled && (
        <div className={`flex items-center justify-between rounded-2xl border px-5 py-4 ${
          isConnected ? "border-emerald-100 bg-emerald-50" : "border-amber-100 bg-amber-50"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${
              isConnected ? "bg-emerald-100" : "bg-amber-100"
            }`}>
              <Landmark className={`h-5 w-5 ${isConnected ? "text-emerald-600" : "text-amber-600"}`} />
            </div>
            <div>
              <p className={`text-sm font-bold ${isConnected ? "text-emerald-900" : "text-amber-900"}`}>
                {isConnected
                  ? `Connected to Xero${xeroConn.data?.tenantName ? ` — ${xeroConn.data.tenantName}` : ""}`
                  : "Xero not connected"}
              </p>
              <p className={`text-xs ${isConnected ? "text-emerald-700" : "text-amber-700"}`}>
                {isConnected
                  ? `Last synced: ${xeroConn.data?.lastSyncAt ? new Date(xeroConn.data.lastSyncAt).toLocaleDateString("en-GB") : "never"}`
                  : "Connect your Xero account to push invoices automatically"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Active
                </span>
                <button
                  type="button"
                  onClick={() => disconnect.mutate()}
                  disabled={disconnect.isPending}
                  className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                >
                  {disconnect.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Disconnect"}
                </button>
              </>
            ) : (
              <a
                href={xeroAuthUrl.data?.url ?? "/api/xero/connect"}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1AB4D7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#13a0c0] transition-colors"
              >
                <Landmark className="h-4 w-4" /> Connect Xero
              </a>
            )}
          </div>
        </div>
      )}

      {/* Invoice list */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Invoices
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {rows.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => setShowGenerate((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Generate Invoice
          </button>
        </div>

        {/* Generate invoice form */}
        {showGenerate && (
          <div className="border-b border-slate-100 bg-orange-50 px-5 py-4">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Generate invoice from accepted site submission
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Site
                </label>
                <select
                  value={genSiteId}
                  onChange={(e) => setGenSiteId(e.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-orange-400 focus:outline-none"
                >
                  <option value="">Select site…</option>
                  {siteList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Week starting (Monday)
                </label>
                <input
                  type="date"
                  value={genWeek}
                  onChange={(e) => setGenWeek(e.target.value)}
                  className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:border-orange-400 focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!genSiteId || !genWeek) {
                    setGenError("Please select a site and week.");
                    return;
                  }
                  generate.mutate({ siteId: genSiteId, weekStart: genWeek });
                }}
                disabled={generate.isPending}
                className="flex h-10 items-center gap-1.5 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
              >
                {generate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {generate.isPending ? "Generating…" : "Generate"}
              </button>
              <button
                type="button"
                onClick={() => { setShowGenerate(false); setGenError(null); }}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
            {genError && (
              <p className="mt-2 text-sm text-red-600">{genError}</p>
            )}
          </div>
        )}

        {rows.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-slate-400">
            No invoices yet. Use &quot;Generate Invoice&quot; once a site submission has been accepted.
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
                  <th className={thCls}>Actions</th>
                  {xeroEnabled && <th className={thCls}>Xero</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => (
                  <tr key={inv.id} className="last:border-0 hover:bg-slate-50/50">
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
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_STYLES[inv.xeroStatus ?? inv.status] ?? STATUS_STYLES.DRAFT
                      }`}>
                        {inv.xeroStatus ?? inv.status}
                      </span>
                    </td>
                    <td className={`${tdCls} text-right`}>
                      <div className="flex items-center justify-end gap-1.5">
                        {inv.status === "DRAFT" && (
                          <button
                            type="button"
                            onClick={() => markSent.mutate({ invoiceId: inv.id })}
                            disabled={markSent.isPending}
                            title="Mark as sent to client"
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            <Send className="h-3 w-3" /> Mark sent
                          </button>
                        )}
                        {(inv.status === "SENT" || inv.status === "OVERDUE") && (
                          <button
                            type="button"
                            onClick={() => markPaid.mutate({ invoiceId: inv.id })}
                            disabled={markPaid.isPending}
                            title="Mark as paid"
                            className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                          >
                            <CheckCheck className="h-3 w-3" /> Mark paid
                          </button>
                        )}
                      </div>
                    </td>
                    {xeroEnabled && (
                      <td className={`${tdCls} text-right`}>
                        {inv.xeroInvoiceId ? (
                          <button
                            type="button"
                            onClick={() => sync.mutate({ invoiceId: inv.id })}
                            disabled={sync.isPending}
                            className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                          >
                            <RefreshCw className="h-3 w-3" /> Sync
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => push.mutate({ invoiceId: inv.id })}
                            disabled={push.isPending}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white transition disabled:opacity-60"
                            style={{ backgroundColor: "#1AB4D7" }}
                          >
                            <Landmark className="h-3 w-3" /> Push to Xero
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
