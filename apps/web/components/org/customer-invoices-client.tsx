"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Plus, FileText, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { ConfirmDialog, type ConfirmState } from "@/components/ui/confirm-dialog";

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DISPUTED: "bg-red-100 text-red-700",
  PAID: "bg-emerald-100 text-emerald-700",
  OVERDUE: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  DISPUTED: "Disputed",
  PAID: "Paid",
  OVERDUE: "Overdue",
};

function fmtCcy(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function CustomerInvoicesClient() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const { data, isLoading } = trpc.customerInvoices.list.useQuery({ status: filter });
  const { data: stats } = trpc.customerInvoices.stats.useQuery();
  const updateStatus = trpc.customerInvoices.updateStatus.useMutation({
    onSuccess: () => {
      void utils.customerInvoices.list.invalidate();
      void utils.customerInvoices.stats.invalidate();
    },
  });
  const deleteInvoice = trpc.customerInvoices.delete.useMutation({
    onSuccess: () => {
      void utils.customerInvoices.list.invalidate();
      void utils.customerInvoices.stats.invalidate();
      setConfirmState(null);
    },
  });

  const statCards = [
    {
      label: "Draft",
      count: stats?.draft._count ?? 0,
      amount: stats?.draft._sum.totalAmount ?? 0,
      icon: <FileText className="h-5 w-5 text-slate-500" />,
      color: "bg-slate-50 border-slate-200",
    },
    {
      label: "Outstanding",
      count: stats?.sent._count ?? 0,
      amount: stats?.sent._sum.totalAmount ?? 0,
      icon: <Clock className="h-5 w-5 text-blue-500" />,
      color: "bg-blue-50 border-blue-200",
    },
    {
      label: "Overdue",
      count: stats?.overdue._count ?? 0,
      amount: stats?.overdue._sum.totalAmount ?? 0,
      icon: <AlertCircle className="h-5 w-5 text-orange-500" />,
      color: "bg-orange-50 border-orange-200",
    },
    {
      label: "Paid",
      count: stats?.paid._count ?? 0,
      amount: stats?.paid._sum.totalAmount ?? 0,
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
      color: "bg-emerald-50 border-emerald-200",
    },
  ];

  const filters = [
    { label: "All", value: undefined },
    { label: "Draft", value: "DRAFT" },
    { label: "Sent", value: "SENT" },
    { label: "Disputed", value: "DISPUTED" },
    { label: "Paid", value: "PAID" },
    { label: "Overdue", value: "OVERDUE" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Customer Invoices"
        subtitle="Track and manage invoices raised to dealerships."
        action={
          <button
            className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: "#E8650A" }}
            onClick={() => alert("Create invoice — coming soon")}
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.color}`}>
            <div className="mb-1 flex items-center gap-2">
              {s.icon}
              <span className="text-xs font-medium text-slate-600">{s.label}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: "#1C1A16" }}>
              {fmtCcy(s.amount)}
            </p>
            <p className="text-xs text-slate-500">{s.count} invoice{s.count !== 1 ? "s" : ""}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.value
                ? "text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            style={filter === f.value ? { backgroundColor: "#E8650A" } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading invoices…</div>
        ) : !data?.items.length ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No invoices found. Create your first invoice to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Site</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium" style={{ color: "#1C1A16" }}>
                    {(inv as unknown as { site?: { name: string } }).site?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold" style={{ color: "#1C1A16" }}>
                    {fmtCcy(inv.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[inv.status] ?? STATUS_STYLES.DRAFT}`}
                    >
                      {STATUS_LABELS[inv.status] ?? inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {inv.status === "DRAFT" && (
                        <button
                          onClick={() =>
                            updateStatus.mutate({ id: inv.id, status: "SENT" })
                          }
                          className="rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        >
                          Mark Sent
                        </button>
                      )}
                      {inv.status === "SENT" && (
                        <button
                          onClick={() =>
                            updateStatus.mutate({ id: inv.id, status: "PAID" })
                          }
                          className="rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          Mark Paid
                        </button>
                      )}
                      {inv.status === "DRAFT" && (
                        <button
                          onClick={() => {
                            setConfirmState({
                              title: "Delete Invoice",
                              description: "Are you sure you want to delete this draft invoice? This cannot be undone.",
                              confirmLabel: "Delete",
                              danger: true,
                              onConfirm: () => deleteInvoice.mutate({ id: inv.id }),
                            });
                          }}
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        state={confirmState}
        onClose={() => setConfirmState(null)}
        isPending={deleteInvoice.isPending}
      />
    </div>
  );
}
