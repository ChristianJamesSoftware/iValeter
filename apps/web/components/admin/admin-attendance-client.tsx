"use client";

import { useState } from "react";
import { Check, X, Clock, Users, AlertTriangle, Download, ChevronDown, ChevronUp, Building2 } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { StatCard } from "@/components/brand/stat-card";
import { OvertimeRequestsPanel } from "@/components/org/overtime-requests-panel";

type Status = "SUBMITTED" | "APPROVED" | "SA_APPROVED" | "DISPUTED" | "DRAFT" | "LOCKED";

const STATUS_LABELS: Record<Status, { label: string; cls: string }> = {
  DRAFT:       { label: "Draft",          cls: "bg-slate-100 text-slate-600" },
  SUBMITTED:   { label: "Submitted",      cls: "bg-blue-100 text-blue-700" },
  APPROVED:    { label: "HO Approved",    cls: "bg-amber-100 text-amber-700" },
  SA_APPROVED: { label: "SA Approved",    cls: "bg-emerald-100 text-emerald-700" },
  DISPUTED:    { label: "Disputed",       cls: "bg-red-100 text-red-600" },
  LOCKED:      { label: "Locked",         cls: "bg-purple-100 text-purple-700" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status as Status] ?? { label: status, cls: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function mondayOf(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  return date.toISOString().slice(0, 10);
}

function fmtDate(d: string | Date | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const TH = "px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left bg-slate-50";
const TD = "px-4 py-3 text-sm border-b border-slate-50";

const inputCls =
  "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400";

export function AdminAttendanceClient() {
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [filterStatus, setFilterStatus] = useState("SUBMITTED");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const timesheets = trpc.timesheets.superAdminList.useQuery({
    weekStart: weekStart || undefined,
    status: filterStatus || undefined,
  });

  // HO (org admin) first sign-off: SUBMITTED → APPROVED
  const hoApprove = trpc.timesheets.orgApprove.useMutation({
    onSuccess: () => utils.timesheets.superAdminList.invalidate(),
  });
  const hoReject = trpc.timesheets.orgReject.useMutation({
    onSuccess: () => {
      utils.timesheets.superAdminList.invalidate();
      setRejectId(null);
      setRejectNote("");
    },
  });

  // SA final sign-off: APPROVED → SA_APPROVED
  const approve = trpc.timesheets.superAdminApprove.useMutation({
    onSuccess: () => utils.timesheets.superAdminList.invalidate(),
  });

  const reject = trpc.timesheets.superAdminReject.useMutation({
    onSuccess: () => {
      utils.timesheets.superAdminList.invalidate();
      setRejectId(null);
      setRejectNote("");
    },
  });

  const rows = timesheets.data ?? [];
  const submitted = rows.filter((r) => r.status === "SUBMITTED").length;
  const pending = rows.filter((r) => r.status === "APPROVED").length;
  const approved = rows.filter((r) => r.status === "SA_APPROVED").length;
  const disputed = rows.filter((r) => r.status === "DISPUTED").length;

  function exportCsv() {
    const header = ["Name", "Pay ID", "Site", "Org", "Week Start", "Regular Hrs", "Overtime Hrs", "Total Hrs", "Status", "SA Approved At"];
    const body = rows.map((r) => [
      `${r.user.firstName} ${r.user.lastName}`,
      r.user.payId ?? "",
      r.site?.name ?? "",
      (r.user as { organisation?: { name: string } }).organisation?.name ?? "",
      fmtDate(r.weekStarting),
      (r.totalRegularHours ?? 0).toFixed(2),
      (r.totalOvertimeHours ?? 0).toFixed(2),
      ((r.totalRegularHours ?? 0) + (r.totalOvertimeHours ?? 0)).toFixed(2),
      r.status,
      fmtDate(r.saApprovedAt ?? null),
    ]);
    const csv = [header, ...body]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sa-attendance-${weekStart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Overtime requests panel */}
      <OvertimeRequestsPanel />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard icon={Clock}         title="Submitted (HO review)" value={submitted} accent="cyan" />
        <StatCard icon={AlertTriangle} title="Awaiting SA Approval"  value={pending}   accent="navy" />
        <StatCard icon={Check}         title="SA Approved"           value={approved}  accent="success" />
        <StatCard icon={X}             title="Disputed"              value={disputed}  accent="navy" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Week starting</label>
          <input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Status filter</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputCls}>
            <option value="">All statuses</option>
            <option value="SUBMITTED">Submitted (awaiting HO)</option>
            <option value="APPROVED">HO Approved (awaiting SA)</option>
            <option value="SA_APPROVED">SA Approved</option>
            <option value="DISPUTED">Disputed</option>
          </select>
        </div>
        <div className="ml-auto">
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Info banner for HO-approved filter */}
      {filterStatus === "APPROVED" && pending > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>{pending} timesheet{pending !== 1 ? "s" : ""}</strong> have been signed off by Head Office and are awaiting your final approval before managers can view them.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className={TH}></th>
                <th className={TH}>Valeter</th>
                <th className={TH}>Pay ID</th>
                <th className={TH}>Site</th>
                <th className={TH}>Organisation</th>
                <th className={TH}>Week Start</th>
                <th className={TH}>Regular</th>
                <th className={TH}>Overtime</th>
                <th className={TH}>Status</th>
                <th className={TH}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.isLoading ? (
                <tr><td className={`${TD} text-slate-400`} colSpan={10}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td className={`${TD} text-slate-400`} colSpan={10}>No timesheets match the current filters.</td></tr>
              ) : (
                rows.map((r) => (
                  <>
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      {/* Expand toggle */}
                      <td className={TD}>
                        <button
                          onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100"
                        >
                          {expandedId === r.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className={`${TD} font-medium text-slate-900`}>{r.user.firstName} {r.user.lastName}</td>
                      <td className={`${TD} font-mono text-xs text-slate-500`}>{r.user.payId ?? "—"}</td>
                      <td className={TD}>{r.site?.name ?? "—"}</td>
                      <td className={TD}>{(r.user as { organisation?: { name: string } }).organisation?.name ?? "—"}</td>
                      <td className={TD}>{fmtDate(r.weekStarting)}</td>
                      <td className={TD}>{(r.totalRegularHours ?? 0).toFixed(2)} h</td>
                      <td className={TD}>{(r.totalOvertimeHours ?? 0).toFixed(2)} h</td>
                      <td className={TD}><StatusBadge status={r.status} /></td>
                      <td className={TD}>
                        {/* Step 1: HO sign-off (SUBMITTED → APPROVED) */}
                        {r.status === "SUBMITTED" && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => hoApprove.mutate({ id: r.id })}
                              disabled={hoApprove.isPending}
                              className="flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                            >
                              <Building2 className="h-3.5 w-3.5" /> HO Approve
                            </button>
                            <button
                              onClick={() => { setRejectId(r.id); setRejectNote(""); }}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>
                          </div>
                        )}
                        {/* Step 2: SA final sign-off (APPROVED → SA_APPROVED) */}
                        {r.status === "APPROVED" && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => approve.mutate({ id: r.id })}
                              disabled={approve.isPending}
                              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" /> SA Approve
                            </button>
                            <button
                              onClick={() => { setRejectId(r.id); setRejectNote(""); }}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </button>

                          </div>
                        )}
                        {r.status === "SA_APPROVED" && (
                          <span className="text-xs text-slate-400">Approved {fmtDate(r.saApprovedAt ?? null)}</span>
                        )}
                      </td>
                    </tr>
                    {/* Reject note inline */}
                    {rejectId === r.id && (
                      <tr key={`${r.id}-reject`} className="bg-red-50">
                        <td colSpan={10} className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <input
                              className="h-9 flex-1 rounded-lg border border-red-200 bg-white px-3 text-sm outline-none focus:border-red-400"
                              placeholder="Reason for rejection (optional)…"
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                            />
                            <button
                              onClick={() => reject.mutate({ id: r.id, note: rejectNote || undefined })}
                              disabled={reject.isPending}
                              className="h-9 rounded-lg bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {reject.isPending ? "…" : "Confirm reject"}
                            </button>
                            <button
                              onClick={() => setRejectId(null)}
                              className="h-9 rounded-lg border border-slate-200 px-3 text-xs text-slate-500 hover:bg-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Expanded lines */}
                    {expandedId === r.id && r.lines.length > 0 && (
                      <tr key={`${r.id}-lines`} className="bg-slate-50">
                        <td colSpan={10} className="px-6 pb-4 pt-2">
                          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Daily breakdown</p>
                          <table className="w-full max-w-xl text-xs">
                            <thead>
                              <tr>
                                <th className="pb-1 text-left font-semibold text-slate-500">Date</th>
                                <th className="pb-1 text-left font-semibold text-slate-500">Clock In</th>
                                <th className="pb-1 text-left font-semibold text-slate-500">Clock Out</th>
                                <th className="pb-1 text-left font-semibold text-slate-500">Break</th>
                                <th className="pb-1 text-left font-semibold text-slate-500">Regular</th>
                                <th className="pb-1 text-left font-semibold text-slate-500">OT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.lines.map((l) => {
                                const fmt = (d: Date | string | null) =>
                                  d ? new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";
                                return (
                                  <tr key={l.id}>
                                    <td className="py-0.5 text-slate-700">{fmtDate(l.date)}</td>
                                    <td className="py-0.5 text-slate-700">{fmt(l.clockInTime)}</td>
                                    <td className="py-0.5 text-slate-700">{fmt(l.clockOutTime)}</td>
                                    <td className="py-0.5 text-slate-500">{l.breakMins}m</td>
                                    <td className="py-0.5 text-slate-700">{(l.regularHours ?? 0).toFixed(2)} h</td>
                                    <td className="py-0.5 text-slate-700">{(l.overtimeHours ?? 0).toFixed(2)} h</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
