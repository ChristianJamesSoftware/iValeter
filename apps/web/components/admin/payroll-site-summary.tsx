"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Send, CheckCircle2, AlertCircle,
  Clock, ChevronDown, ChevronUp, Download, Users, Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

function addDays(iso: string, n: number) {
  const d = new Date(iso);
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0] ?? iso;
}

function fmtRange(weekStart: string) {
  const s = new Date(weekStart);
  const e = new Date(weekStart);
  e.setDate(s.getDate() + 6);
  return `${s.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

const SUBMISSION_CHIP: Record<string, { label: string; cls: string }> = {
  PENDING_SEND:     { label: "Ready to send",    cls: "bg-amber-100 text-amber-700" },
  SENT:             { label: "Awaiting dealer",  cls: "bg-blue-100 text-blue-700" },
  DEALER_ACCEPTED:  { label: "Dealer approved",  cls: "bg-emerald-100 text-emerald-700" },
  DEALER_DISPUTED:  { label: "Queried",          cls: "bg-red-100 text-red-700" },
  AUTO_ACCEPTED:    { label: "Auto-approved",    cls: "bg-slate-100 text-slate-600" },
};

// ─── NatWest BACS export ─────────────────────────────────────────────────────
function buildBacs(rows: {
  sortCode: string; accountNumber: string; accountName: string;
  reference: string; totalPay: string; name: string; siteName: string;
}[], weekStart: string): string {
  const header = `NatWest Bankline Export — Week ${weekStart}\n`;
  const cols = ["Sort Code", "Account No", "Account Name", "Reference", "Amount £", "Name", "Site"];
  const lines = [cols.join("\t")];
  for (const r of rows) {
    lines.push([
      r.sortCode.replace(/-/g, ""),
      r.accountNumber,
      r.accountName,
      r.reference,
      r.totalPay,
      r.name,
      r.siteName,
    ].join("\t"));
  }
  return header + lines.join("\n");
}

// ─── Countdown to auto-approve ───────────────────────────────────────────────
function AutoApproveCountdown({ autoApproveAt }: { autoApproveAt: string | null }) {
  const [remaining, setRemaining] = useState("");

  const calc = useCallback(() => {
    if (!autoApproveAt) return;
    const diff = new Date(autoApproveAt).getTime() - Date.now();
    if (diff <= 0) { setRemaining("Auto-approving…"); return; }
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    setRemaining(`${h}h ${m}m ${s}s`);
  }, [autoApproveAt]);

  useEffect(() => {
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, [calc]);

  if (!autoApproveAt) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Clock className="h-3 w-3" />
      Auto-approves in {remaining}
    </span>
  );
}

// ─── Valeter detail row ──────────────────────────────────────────────────────
type ValeterRow = {
  timesheetId: string;
  name: string;
  agreedHours: number;
  actualRegular: number;
  actualOvertime: number;
  estimatedPay: number;
  status: string;
};

function ValeterDetailPanel({ siteId, weekStart }: { siteId: string; weekStart: string }) {
  const { data, isLoading } = trpc.siteSubmissions.siteValeterDetail.useQuery({ siteId, weekStart });

  if (isLoading) return (
    <div className="flex items-center gap-2 px-6 py-4 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading valeters…
    </div>
  );

  const rows = data ?? [];

  return (
    <div className="border-t border-slate-100 bg-slate-50">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-6 py-2 text-left">Valeter</th>
            <th className="px-6 py-2 text-right">Agreed hrs</th>
            <th className="px-6 py-2 text-right">Actual hrs</th>
            <th className="px-6 py-2 text-right">Overtime</th>
            <th className="px-6 py-2 text-right">Variance</th>
            <th className="px-6 py-2 text-center">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: ValeterRow) => {
            const variance = r.actualRegular - r.agreedHours;
            return (
              <tr key={r.timesheetId} className="border-t border-slate-100">
                <td className="px-6 py-2 font-medium text-slate-900">{r.name}</td>
                <td className="px-6 py-2 text-right tabular-nums text-slate-600">{r.agreedHours.toFixed(1)}</td>
                <td className="px-6 py-2 text-right tabular-nums text-slate-700">{r.actualRegular.toFixed(1)}</td>
                <td className="px-6 py-2 text-right tabular-nums text-slate-700">{r.actualOvertime.toFixed(1)}</td>
                <td className={cn(
                  "px-6 py-2 text-right tabular-nums font-semibold",
                  variance > 0 ? "text-amber-600" : variance < 0 ? "text-red-500" : "text-slate-400",
                )}>
                  {variance > 0 ? "+" : ""}{variance.toFixed(1)}
                </td>
                <td className="px-6 py-2 text-center">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {r.status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 text-xs font-bold text-slate-700">
            <td className="px-6 py-2">Totals</td>
            <td className="px-6 py-2 text-right tabular-nums">
              {rows.reduce((a: number, r: ValeterRow) => a + r.agreedHours, 0).toFixed(1)}
            </td>
            <td className="px-6 py-2 text-right tabular-nums">
              {rows.reduce((a: number, r: ValeterRow) => a + r.actualRegular, 0).toFixed(1)}
            </td>
            <td className="px-6 py-2 text-right tabular-nums">
              {rows.reduce((a: number, r: ValeterRow) => a + r.actualOvertime, 0).toFixed(1)}
            </td>
            <td className="px-6 py-2" />
            <td className="px-6 py-2" />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
interface PayrollSiteSummaryProps {
  initialWeekStart: string;
}

export function PayrollSiteSummary({ initialWeekStart }: PayrollSiteSummaryProps) {
  const [weekStart, setWeekStart] = useState(initialWeekStart);
  const [expandedSite, setExpandedSite] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState<string | null>(null); // submissionId
  const [disputeNote, setDisputeNote] = useState("");

  const utils = trpc.useUtils();
  const { data: weeks } = trpc.hq.payrollWeeks.useQuery();

  useEffect(() => {
    if (weeks && weeks.length > 0 && weeks[0]) setWeekStart(weeks[0]);
  }, [weeks]);

  const { data: sites, refetch } = trpc.siteSubmissions.siteSummary.useQuery({ weekStart });
  const { data: exportData } = trpc.siteSubmissions.natwestExport.useQuery({ weekStart });

  const sendToDealer = trpc.siteSubmissions.sendToDealer.useMutation({
    onSuccess: () => void refetch(),
  });

  const rows = sites ?? [];
  const acceptedCount = rows.filter(
    (r) => r.submissionStatus === "DEALER_ACCEPTED" || r.submissionStatus === "AUTO_ACCEPTED",
  ).length;
  const exportRows = exportData?.rows ?? [];
  const canExport = exportRows.length > 0;

  function downloadBacs() {
    const content = buildBacs(exportRows, weekStart);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `natwest-bacs-${weekStart}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const changeWeek = (n: number) => {
    setWeekStart(addDays(weekStart, n));
    setExpandedSite(null);
  };

  return (
    <div className="space-y-5">
      {/* Week picker */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => changeWeek(-7)}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Previous week">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {weeks && weeks.length > 1 ? (
          <select value={weekStart}
            onChange={(e) => { setWeekStart(e.target.value); setExpandedSite(null); }}
            className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-center text-sm font-semibold text-slate-900 outline-none">
            {weeks.map((w) => <option key={w} value={w}>{fmtRange(w)}</option>)}
          </select>
        ) : (
          <span className="min-w-[200px] text-center text-sm font-semibold text-slate-900">{fmtRange(weekStart)}</span>
        )}
        <button type="button" onClick={() => changeWeek(7)}
          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          aria-label="Next week">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div className="flex gap-6 text-sm">
          <div><span className="text-slate-500">Sites: </span><span className="font-bold text-slate-900">{rows.length}</span></div>
          <div><span className="text-slate-500">Ready to send: </span><span className="font-bold text-amber-600">{rows.filter(r => r.allApproved && !r.submissionStatus).length}</span></div>
          <div><span className="text-slate-500">Awaiting dealer: </span><span className="font-bold text-blue-600">{rows.filter(r => r.submissionStatus === "SENT").length}</span></div>
          <div><span className="text-slate-500">Dealer accepted: </span><span className="font-bold text-emerald-600">{acceptedCount}</span></div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={downloadBacs} disabled={!canExport}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
            <Download className="h-4 w-4" />
            NatWest BACS ({exportRows.length})
          </button>
          <button type="button" disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-[#01696F] px-4 py-2 text-sm font-semibold text-[#01696F] opacity-50">
            <Download className="h-4 w-4" />
            Export to Xero
          </button>
        </div>
      </div>

      {/* Site cards */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white py-12 text-center text-sm text-slate-400 shadow-sm">
          No timesheets found for this week.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((site) => {
            const isExpanded = expandedSite === site.siteId;
            const chip = site.submissionStatus
              ? SUBMISSION_CHIP[site.submissionStatus]
              : site.allApproved
                ? SUBMISSION_CHIP.PENDING_SEND
                : null;

            const isSending = sendToDealer.isPending && sendToDealer.variables?.siteId === site.siteId;
            const canSend = site.allApproved && (!site.submissionStatus || site.submissionStatus === "DEALER_DISPUTED");
            const isAccepted = site.submissionStatus === "DEALER_ACCEPTED" || site.submissionStatus === "AUTO_ACCEPTED";

            return (
              <div key={site.siteId}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-white shadow-sm transition-all",
                  isAccepted ? "border-emerald-200" : site.submissionStatus === "DEALER_DISPUTED" ? "border-red-200" : "border-slate-100",
                )}>
                {/* Header row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Site info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">{site.siteName}</span>
                      {chip && (
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", chip.cls)}>
                          {chip.label}
                        </span>
                      )}
                      {!site.allApproved && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                          {site.approvedCount}/{site.totalCount} approved
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{site.totalValeters} valeters</span>
                      <span>Agreed <strong className="text-slate-700">{site.agreedHours.toFixed(0)}h</strong></span>
                      <span>Actual <strong className="text-slate-700">{site.actualRegular.toFixed(1)}h</strong></span>
                      {site.actualOvertime > 0 && (
                        <span className="text-amber-600">+{site.actualOvertime.toFixed(1)}h OT</span>
                      )}
                      {site.submissionStatus === "SENT" && (
                        <AutoApproveCountdown
                          autoApproveAt={site.sentAt
                            ? new Date(new Date(site.sentAt).getTime() + 4 * 60 * 60 * 1000).toISOString()
                            : null}
                        />
                      )}
                    </div>
                    {/* Dispute note */}
                    {site.dealerDisputeNote && (
                      <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span><strong>Dealer note:</strong> {site.dealerDisputeNote}</span>
                      </div>
                    )}
                    {site.submissionStatus === "DEALER_ACCEPTED" && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Dealer accepted {fmtTime(site.dealerRespondedAt)}
                      </div>
                    )}
                    {site.submissionStatus === "AUTO_ACCEPTED" && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Auto-accepted {fmtTime(site.autoAcceptedAt)}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    {canSend && (
                      <button type="button"
                        onClick={() => sendToDealer.mutate({ siteId: site.siteId, weekStart })}
                        disabled={isSending}
                        className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Send to Dealer
                      </button>
                    )}
                    <button type="button"
                      onClick={() => setExpandedSite(isExpanded ? null : site.siteId)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                      aria-label={isExpanded ? "Collapse" : "Expand"}>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded valeter detail */}
                {isExpanded && <ValeterDetailPanel siteId={site.siteId} weekStart={weekStart} />}
              </div>
            );
          })}
        </div>
      )}

      {/* Dispute modal */}
      {disputeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-base font-bold text-slate-900">Raise a query</h3>
            <textarea
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="Describe the issue with this submission…"
              rows={4}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setDisputeOpen(null); setDisputeNote(""); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
