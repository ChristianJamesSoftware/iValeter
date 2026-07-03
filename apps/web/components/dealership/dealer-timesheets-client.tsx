"use client";

import { useState } from "react";
import {
  CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp, Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtRange(iso: string) {
  const s = new Date(iso);
  const e = new Date(iso);
  e.setDate(s.getDate() + 6);
  return `${s.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// Live countdown to auto-approve
function Countdown({ autoApproveAt }: { autoApproveAt: string | null }) {
  const [remaining, setRemaining] = useState("");

  useState(() => {
    if (!autoApproveAt) return;
    const tick = () => {
      const diff = new Date(autoApproveAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Approving shortly…"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  });

  if (!autoApproveAt || !remaining) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
      <Clock className="h-3 w-3" />
      Auto-approves in {remaining}
    </span>
  );
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  SENT:             { label: "Awaiting your approval", cls: "bg-amber-100 text-amber-700" },
  DEALER_ACCEPTED:  { label: "You approved",           cls: "bg-emerald-100 text-emerald-700" },
  DEALER_DISPUTED:  { label: "Query raised",           cls: "bg-red-100 text-red-700" },
  AUTO_ACCEPTED:    { label: "Auto-approved",          cls: "bg-slate-100 text-slate-600" },
};

type Submission = {
  id: string;
  siteId: string;
  siteName: string;
  weekStarting: string;
  status: string;
  sentAt: string | null;
  dealerRespondedAt: string | null;
  dealerDisputeNote: string | null;
  autoAcceptedAt: string | null;
  autoApproveAt: string | null;
};

type ValeterRow = {
  timesheetId: string;
  name: string;
  agreedHours: number;
  actualRegular: number;
  actualOvertime: number;
  status: string;
};

// ─── Valeter detail (no pay figures) ────────────────────────────────────────
function ValeterDetail({ siteId, weekStart }: { siteId: string; weekStart: string }) {
  const { data, isLoading } = trpc.siteSubmissions.siteValeterDetail.useQuery({ siteId, weekStart });

  if (isLoading) return (
    <div className="flex items-center gap-2 px-6 py-4 text-sm text-slate-500">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading…
    </div>
  );

  const rows = (data ?? []) as ValeterRow[];

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
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const variance = r.actualRegular - r.agreedHours;
            return (
              <tr key={r.timesheetId} className="border-t border-slate-100">
                <td className="px-6 py-2.5 font-medium text-slate-900">{r.name}</td>
                <td className="px-6 py-2.5 text-right tabular-nums text-slate-600">{r.agreedHours.toFixed(1)}</td>
                <td className="px-6 py-2.5 text-right tabular-nums text-slate-700">{r.actualRegular.toFixed(1)}</td>
                <td className="px-6 py-2.5 text-right tabular-nums text-slate-700">{r.actualOvertime.toFixed(1)}</td>
                <td className={cn(
                  "px-6 py-2.5 text-right tabular-nums font-semibold",
                  variance > 0 ? "text-amber-600" : variance < 0 ? "text-red-500" : "text-slate-400",
                )}>
                  {variance > 0 ? "+" : ""}{variance.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200 text-xs font-bold text-slate-700">
            <td className="px-6 py-2">Totals</td>
            <td className="px-6 py-2 text-right tabular-nums">
              {rows.reduce((a, r) => a + r.agreedHours, 0).toFixed(1)}
            </td>
            <td className="px-6 py-2 text-right tabular-nums">
              {rows.reduce((a, r) => a + r.actualRegular, 0).toFixed(1)}
            </td>
            <td className="px-6 py-2 text-right tabular-nums">
              {rows.reduce((a, r) => a + r.actualOvertime, 0).toFixed(1)}
            </td>
            <td className="px-6 py-2" />
          </tr>
        </tfoot>
      </table>
      <p className="px-6 py-3 text-[11px] text-slate-400">
        Agreed hours are based on contracted hours for the week. Variance shows actual vs agreed regular time.
      </p>
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────
export function DealerTimesheetsClient() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [disputeNote, setDisputeNote] = useState("");

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.siteSubmissions.dealerList.useQuery({});

  const accept = trpc.siteSubmissions.dealerAccept.useMutation({
    onSuccess: () => utils.siteSubmissions.dealerList.invalidate(),
  });

  const dispute = trpc.siteSubmissions.dealerDispute.useMutation({
    onSuccess: () => {
      utils.siteSubmissions.dealerList.invalidate();
      setDisputeId(null);
      setDisputeNote("");
    },
  });

  const submissions = (data ?? []) as Submission[];
  const pending = submissions.filter((s) => s.status === "SENT").length;

  if (isLoading) return (
    <div className="flex items-center gap-2 py-12 text-center text-sm text-slate-400">
      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
    </div>
  );

  if (submissions.length === 0) return (
    <div className="rounded-2xl border border-slate-100 bg-white py-16 text-center shadow-sm">
      <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-slate-300" />
      <p className="text-sm text-slate-400">No timesheets to review at the moment.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Pending banner */}
      {pending > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="text-sm font-semibold text-amber-800">
            {pending} timesheet{pending > 1 ? "s" : ""} awaiting your approval.
            Auto-approval applies after 4 hours if no action is taken.
          </p>
        </div>
      )}

      {submissions.map((sub) => {
        const cfg = STATUS_CONFIG[sub.status] ?? { label: sub.status, cls: "bg-slate-100 text-slate-600" };
        const isExpanded = expandedId === sub.id;
        const isPending = sub.status === "SENT";
        const isAccepting = accept.isPending && accept.variables?.submissionId === sub.id;

        return (
          <div key={sub.id}
            className={cn(
              "overflow-hidden rounded-2xl border bg-white shadow-sm",
              isPending ? "border-amber-200" : sub.status === "DEALER_DISPUTED" ? "border-red-200" : "border-slate-100",
            )}>
            {/* Header */}
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-slate-900">{sub.siteName}</span>
                  <span className="text-sm text-slate-500">{fmtRange(sub.weekStarting)}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", cfg.cls)}>
                    {cfg.label}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  {sub.sentAt && <span>Sent {fmtTime(sub.sentAt)}</span>}
                  {isPending && <Countdown autoApproveAt={sub.autoApproveAt} />}
                  {sub.dealerRespondedAt && !isPending && (
                    <span>Responded {fmtTime(sub.dealerRespondedAt)}</span>
                  )}
                  {sub.autoAcceptedAt && (
                    <span>Auto-accepted {fmtTime(sub.autoAcceptedAt)}</span>
                  )}
                </div>

                {sub.dealerDisputeNote && (
                  <div className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                    <strong>Your note:</strong> {sub.dealerDisputeNote}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-2">
                {isPending && (
                  <>
                    <button type="button"
                      onClick={() => accept.mutate({ submissionId: sub.id })}
                      disabled={isAccepting}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50">
                      {isAccepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Approve
                    </button>
                    <button type="button"
                      onClick={() => setDisputeId(sub.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50">
                      <AlertCircle className="h-4 w-4" />
                      Query
                    </button>
                  </>
                )}
                {sub.status === "DEALER_ACCEPTED" && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
                <button type="button"
                  onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Valeter breakdown */}
            {isExpanded && (
              <ValeterDetail siteId={sub.siteId} weekStart={sub.weekStarting.slice(0, 10)} />
            )}
          </div>
        );
      })}

      {/* Dispute modal */}
      {disputeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-1 text-base font-bold text-slate-900">Raise a query</h3>
            <p className="mb-4 text-sm text-slate-500">
              Describe the issue and our team will review it. The submission will be marked as queried.
            </p>
            <textarea
              value={disputeNote}
              onChange={(e) => setDisputeNote(e.target.value)}
              placeholder="e.g. Hours on Thursday don't match our records…"
              rows={4}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-slate-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button"
                onClick={() => { setDisputeId(null); setDisputeNote(""); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button"
                onClick={() => dispute.mutate({ submissionId: disputeId, note: disputeNote })}
                disabled={disputeNote.trim().length < 5 || dispute.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {dispute.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Submit Query
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
