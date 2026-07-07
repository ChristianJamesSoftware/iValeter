"use client";

import { useState } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Receipt,
  ExternalLink,
  BadgePoundSterling,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

function fmtDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function pence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

// ─── SERVICE CHARGE TYPE LABEL ─────────────────────────────────────────────
const SCR_TYPE_LABELS: Record<string, string> = {
  PAINT_PROTECTION: "Paint Protection",
  CSI_ADDON: "CSI Add-On",
  WORK_CLOTHES: "Work Clothes",
  SUBCONTRACTOR: "Subcontractor",
  OTHER: "Other",
};

// ─── Reject note inline form ───────────────────────────────────────────────
function RejectForm({
  onConfirm,
  onCancel,
  isPending,
}: {
  onConfirm: (note: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        autoFocus
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Reason for rejection…"
        className="flex-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs text-slate-800 outline-none focus:border-red-400"
      />
      <button
        disabled={isPending || note.trim().length < 3}
        onClick={() => onConfirm(note.trim())}
        className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
      >
        Confirm
      </button>
      <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600">
        Cancel
      </button>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────
type Tab = "overtime" | "receipts" | "serviceCharges";

export function OvertimeRequestsPanel() {
  const [open, setOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overtime");
  const [rejectingExpenseId, setRejectingExpenseId] = useState<string | null>(null);
  const [rejectingScrId, setRejectingScrId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: otRequests, isLoading: otLoading } = trpc.overtime.listPending.useQuery();
  const { data: pendingExpenses, isLoading: expLoading } = trpc.expenses.listPending.useQuery();
  const { data: pendingScr, isLoading: scrLoading } = trpc.serviceCharges.listPending.useQuery();

  const reviewOT = trpc.overtime.review.useMutation({
    onSuccess: () => void utils.overtime.listPending.invalidate(),
  });

  const approveExp = trpc.expenses.approve.useMutation({
    onSuccess: () => void utils.expenses.listPending.invalidate(),
  });

  const rejectExp = trpc.expenses.reject.useMutation({
    onSuccess: () => {
      void utils.expenses.listPending.invalidate();
      setRejectingExpenseId(null);
    },
  });

  const approveScr = trpc.serviceCharges.approve.useMutation({
    onSuccess: () => void utils.serviceCharges.listPending.invalidate(),
  });

  const rejectScr = trpc.serviceCharges.reject.useMutation({
    onSuccess: () => {
      void utils.serviceCharges.listPending.invalidate();
      setRejectingScrId(null);
    },
  });

  const otPending = otRequests ?? [];
  const expPending = pendingExpenses ?? [];
  const scrPending = pendingScr ?? [];
  const totalPending = otPending.length + expPending.length + scrPending.length;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <h2 className="text-base font-bold text-slate-900">OT &amp; Receipts</h2>
          {totalPending > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[11px] font-black text-white">
              {totalPending}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100">
          {/* Tabs */}
          <div className="flex border-b border-slate-100 bg-slate-50 px-5 pt-2">
            {/* Overtime tab */}
            <button
              onClick={() => setActiveTab("overtime")}
              className={cn(
                "flex items-center gap-1.5 border-b-2 pb-2.5 pr-5 text-xs font-semibold transition-colors",
                activeTab === "overtime"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-400 hover:text-slate-600",
              )}
            >
              <Clock className="h-3.5 w-3.5" />
              Overtime
              {otPending.length > 0 && (
                <span className="ml-1 rounded-full bg-orange-100 px-1.5 text-[10px] font-bold text-orange-600">
                  {otPending.length}
                </span>
              )}
            </button>

            {/* Receipts tab */}
            <button
              onClick={() => setActiveTab("receipts")}
              className={cn(
                "flex items-center gap-1.5 border-b-2 pb-2.5 pr-5 text-xs font-semibold transition-colors",
                activeTab === "receipts"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-400 hover:text-slate-600",
              )}
            >
              <Receipt className="h-3.5 w-3.5" />
              Receipts
              {expPending.length > 0 && (
                <span className="ml-1 rounded-full bg-orange-100 px-1.5 text-[10px] font-bold text-orange-600">
                  {expPending.length}
                </span>
              )}
            </button>

            {/* Service Charges tab */}
            <button
              onClick={() => setActiveTab("serviceCharges")}
              className={cn(
                "flex items-center gap-1.5 border-b-2 pb-2.5 text-xs font-semibold transition-colors",
                activeTab === "serviceCharges"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-slate-400 hover:text-slate-600",
              )}
            >
              <BadgePoundSterling className="h-3.5 w-3.5" />
              Service Charges
              {scrPending.length > 0 && (
                <span className="ml-1 rounded-full bg-orange-100 px-1.5 text-[10px] font-bold text-orange-600">
                  {scrPending.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Overtime tab ── */}
          {activeTab === "overtime" && (
            otLoading ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
            ) : otPending.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">No pending overtime requests</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Valeter</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Date</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Hours</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Reason</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Submitted</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {otPending.map((req) => (
                    <tr key={req.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {req.user.firstName} {req.user.lastName}
                        {req.user.site && (
                          <span className="ml-1.5 text-xs text-slate-400">{req.user.site.name}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{fmtDate(req.requestedDate)}</td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900">{req.requestedHours}h</span>
                      </td>
                      <td className="px-5 py-4 text-slate-600 max-w-[200px]">
                        {req.overtimeReason?.label ?? req.reason ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs">{fmtDate(req.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => reviewOT.mutate({ requestId: req.id, action: "APPROVED" })}
                            disabled={reviewOT.isPending}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => reviewOT.mutate({ requestId: req.id, action: "DECLINED" })}
                            disabled={reviewOT.isPending}
                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Decline
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* ── Receipts tab ── */}
          {activeTab === "receipts" && (
            expLoading ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
            ) : expPending.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Receipt className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-400">No pending receipts</p>
                <p className="mt-1 text-xs text-slate-300">Approved receipts are bundled into payroll on lock</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Valeter</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Week</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Receipt</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expPending.map((exp) => (
                    <tr key={exp.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {exp.user.firstName} {exp.user.lastName}
                        {exp.user.site && (
                          <span className="ml-1.5 text-xs text-slate-400">{exp.user.site.name}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-700 max-w-[220px]">
                        <p className="truncate">{exp.description}</p>
                        <p className="text-[11px] text-slate-400">Submitted {fmtDate(exp.createdAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-900">{pence(exp.amountPence)}</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {fmtDate(exp.weekStarting)}
                      </td>
                      <td className="px-5 py-4">
                        {exp.receiptFileUrl ? (
                          <a
                            href={exp.receiptFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        ) : (
                          <span className="text-xs text-slate-300">None</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {rejectingExpenseId === exp.id ? (
                          <RejectForm
                            isPending={rejectExp.isPending}
                            onConfirm={(note) => rejectExp.mutate({ expenseId: exp.id, note })}
                            onCancel={() => setRejectingExpenseId(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => approveExp.mutate({ expenseId: exp.id })}
                              disabled={approveExp.isPending}
                              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingExpenseId(exp.id)}
                              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}

          {/* ── Service Charges tab ── */}
          {activeTab === "serviceCharges" && (
            scrLoading ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
            ) : scrPending.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <BadgePoundSterling className="mx-auto mb-2 h-8 w-8 text-slate-200" />
                <p className="text-sm text-slate-400">No pending service charges</p>
                <p className="mt-1 text-xs text-slate-300">
                  Paint Protection, CSI Add-Ons and Work Clothes auto-appear here when a job completes
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Valeter</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Type</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Description</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Amount</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Week</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Nominal</th>
                    <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scrPending.map((scr) => (
                    <tr key={scr.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {scr.user.firstName} {scr.user.lastName}
                        {scr.site && (
                          <span className="ml-1.5 text-xs text-slate-400">{scr.site.name}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                          {SCR_TYPE_LABELS[scr.type] ?? scr.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700 max-w-[220px]">
                        <p className="truncate text-xs">{scr.description}</p>
                        {scr.booking && (
                          <p className="text-[11px] text-slate-400">
                            {scr.booking.vehicleReg} · {scr.booking.customerName}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {scr.amountPence > 0 ? (
                          <span className="font-bold text-slate-900">{pence(scr.amountPence)}</span>
                        ) : (
                          <span className="text-xs text-amber-600 font-semibold">Set on approval</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {fmtDate(scr.weekStarting)}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {scr.xeroNominalCode
                          ? `${scr.xeroNominalCode.xeroAccountCode} · ${scr.xeroNominalCode.name}`
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        {rejectingScrId === scr.id ? (
                          <RejectForm
                            isPending={rejectScr.isPending}
                            onConfirm={(note) => rejectScr.mutate({ requestId: scr.id, reviewNote: note })}
                            onCancel={() => setRejectingScrId(null)}
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => approveScr.mutate({ requestId: scr.id })}
                              disabled={approveScr.isPending}
                              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingScrId(scr.id)}
                              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      )}
    </div>
  );
}
