"use client";

/**
 * BankChangeReview
 * ─────────────────
 * Manager-side UI for bank details change requests.
 *
 * Flow:
 *  1. Valeter submits → VALETER_REQUESTED
 *  2. Manager sees alert badge, opens this panel
 *  3. Manager calls the valeter, reads back details, ticks verbal confirmation checkbox
 *  4. Approve button unlocks → moves to PENDING (ops can now see & apply)
 *  5. Or manager can Reject with a reason
 *
 * Ops history view shows all requests (any status) below.
 */

import React, { useState } from "react";
import {
  Phone, ShieldCheck, ShieldX, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, Clock, XCircle, History,
  Landmark, User, MapPin,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type BankChangeStatus = "VALETER_REQUESTED" | "PENDING" | "APPROVED" | "REJECTED";

interface Request {
  id: string;
  status: BankChangeStatus;
  newSortCode: string;
  newAccountNumber: string;
  newAccountName: string;
  newBankReference: string | null;
  notes: string | null;
  verballyConfirmedAt: string | null;
  verballyConfirmedBy: string | null;
  reviewedAt: string | null;
  feeAmount: number;
  feeDeducted: boolean;
  createdAt: string;
  valeter: {
    id: string;
    firstName: string;
    lastName: string;
    payId: string | null;
    bankSortCode: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
    site: { name: string } | null;
  };
}

interface HistoryRequest {
  id: string;
  status: BankChangeStatus;
  newSortCode: string;
  newAccountNumber: string;
  newAccountName: string;
  notes: string | null;
  reviewedAt: string | null;
  createdAt: string;
  valeter: {
    id: string;
    firstName: string;
    lastName: string;
    payId: string | null;
    site: { name: string } | null;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<BankChangeStatus, { label: string; colour: string; Icon: React.ElementType }> = {
  VALETER_REQUESTED: { label: "Awaiting manager review",      colour: "bg-amber-100 text-amber-800",    Icon: Clock },
  PENDING:           { label: "Manager approved — ops to apply", colour: "bg-blue-100 text-blue-800",    Icon: ShieldCheck },
  APPROVED:          { label: "Applied to payroll",            colour: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 },
  REJECTED:          { label: "Rejected",                      colour: "bg-red-100 text-red-800",        Icon: XCircle },
};

function fmtDate(d: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function maskSort(s: string | null) {
  if (!s) return "—";
  return s.replace(/(\d{2})-?(\d{2})-?(\d{2})/, "$1-$2-$3");
}

function maskAcc(a: string | null) {
  if (!a) return "—";
  return "••••" + a.slice(-4);
}

// ─── Pending request card ─────────────────────────────────────────────────────

function PendingCard({ req, onDone }: { req: Request; onDone: () => void }) {
  const [verbalTicked, setVerbalTicked] = useState(!!req.verballyConfirmedAt);
  const [showReject, setShowReject]     = useState(false);
  const [rejectNote, setRejectNote]     = useState("");
  const [approveNote, setApproveNote]   = useState("");
  const [err, setErr]                   = useState("");

  const utils = trpc.useUtils();

  const confirmVerbal = trpc.bankChanges.markVerbalConfirmation.useMutation({
    onSuccess: () => {
      setVerbalTicked(true);
      void utils.bankChanges.listValeterRequested.invalidate();
    },
    onError: (e) => setErr(e.message),
  });

  const approve = trpc.bankChanges.managerApprove.useMutation({
    onSuccess: () => { void utils.bankChanges.listValeterRequested.invalidate(); void utils.bankChanges.listAllForOrg.invalidate(); onDone(); },
    onError: (e) => setErr(e.message),
  });

  const reject = trpc.bankChanges.reject.useMutation({
    onSuccess: () => { void utils.bankChanges.listValeterRequested.invalidate(); void utils.bankChanges.listAllForOrg.invalidate(); onDone(); },
    onError: (e) => setErr(e.message),
  });

  const isConfirmed = verbalTicked || !!req.verballyConfirmedAt;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-4">

      {/* Valeter identity */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <span className="font-bold text-slate-900 text-lg">
              {req.valeter.firstName} {req.valeter.lastName}
            </span>
            {req.valeter.payId && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                #{req.valeter.payId}
              </span>
            )}
          </div>
          {req.valeter.site && (
            <div className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              {req.valeter.site.name}
            </div>
          )}
          <p className="mt-1 text-xs text-slate-400">Requested {fmtDate(req.createdAt)}</p>
        </div>
        <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-800 whitespace-nowrap">
          Action Required
        </span>
      </div>

      {/* Side-by-side: current → new */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Current details</p>
          <p className="text-sm font-semibold text-slate-700">{req.valeter.bankAccountName ?? "—"}</p>
          <p className="text-sm text-slate-500">{maskSort(req.valeter.bankSortCode)} / {maskAcc(req.valeter.bankAccountNumber)}</p>
        </div>
        <div className="rounded-xl border-2 border-orange-300 bg-white p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-orange-500">Requested new details</p>
          <p className="text-sm font-bold text-slate-900">{req.newAccountName}</p>
          <p className="text-sm font-mono text-slate-700">{maskSort(req.newSortCode)} / {req.newAccountNumber}</p>
          {req.newBankReference && (
            <p className="mt-0.5 text-xs text-slate-400">Ref: {req.newBankReference}</p>
          )}
        </div>
      </div>

      {/* Step 1: Call instruction */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">1</span>
          <p className="font-semibold text-slate-800">Call the valeter and read back their new details</p>
        </div>
        <div className="ml-8 space-y-1 text-sm text-slate-600">
          <p>Ask them to confirm:</p>
          <ul className="ml-4 list-disc space-y-0.5 text-slate-700 font-medium">
            <li>Account name: <span className="font-bold">{req.newAccountName}</span></li>
            <li>Sort code: <span className="font-bold font-mono">{maskSort(req.newSortCode)}</span></li>
            <li>Account number: <span className="font-bold font-mono">{req.newAccountNumber}</span></li>
            {req.newBankReference && <li>Reference: <span className="font-bold">{req.newBankReference}</span></li>}
          </ul>
        </div>

        {/* Verbal confirmation checkbox */}
        <label className={cn(
          "ml-8 flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition",
          isConfirmed
            ? "border-emerald-400 bg-emerald-50"
            : "border-dashed border-slate-300 bg-slate-50 hover:border-orange-400",
        )}>
          <input
            type="checkbox"
            checked={isConfirmed}
            disabled={isConfirmed || confirmVerbal.isPending}
            onChange={() => {
              if (!isConfirmed) {
                confirmVerbal.mutate({ id: req.id });
              }
            }}
            className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
          />
          <div>
            <p className={cn("text-sm font-bold", isConfirmed ? "text-emerald-700" : "text-slate-700")}>
              {isConfirmed ? "✓ Verbally confirmed" : "I have called and verbally confirmed these bank details with the valeter"}
            </p>
            {isConfirmed && req.verballyConfirmedAt && (
              <p className="mt-0.5 text-xs text-emerald-600">{fmtDate(req.verballyConfirmedAt)}</p>
            )}
            {!isConfirmed && (
              <p className="mt-0.5 text-xs text-slate-400">
                This checkbox is required before you can approve the request
              </p>
            )}
          </div>
        </label>
      </div>

      {/* Step 2: Approve / Reject */}
      <div className="rounded-xl bg-white border border-slate-200 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white",
            isConfirmed ? "bg-orange-500" : "bg-slate-300",
          )}>2</span>
          <p className={cn("font-semibold", isConfirmed ? "text-slate-800" : "text-slate-400")}>
            Approve or reject the request
          </p>
        </div>

        {!isConfirmed && (
          <p className="ml-8 text-xs text-slate-400 italic">
            Complete step 1 first — verbal confirmation required before approving
          </p>
        )}

        {isConfirmed && !showReject && (
          <div className="ml-8 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Note (optional)</label>
              <input
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                placeholder="e.g. Confirmed with valeter via phone at 09:15"
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                disabled={approve.isPending}
                onClick={() => {
                  setErr("");
                  approve.mutate({ id: req.id, notes: approveNote || undefined });
                }}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                <ShieldCheck className="h-4 w-4" />
                {approve.isPending ? "Approving…" : "Approve — send to ops"}
              </button>
              <button
                onClick={() => setShowReject(true)}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition"
              >
                <ShieldX className="h-4 w-4" />
                Reject
              </button>
            </div>
          </div>
        )}

        {showReject && (
          <div className="ml-8 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-red-600">Reason for rejection *</label>
              <textarea
                rows={2}
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder="e.g. Details could not be verified — valeter to resubmit"
                className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
            </div>
            <div className="flex gap-2">
              <button
                disabled={!rejectNote.trim() || reject.isPending}
                onClick={() => {
                  setErr("");
                  reject.mutate({ id: req.id, notes: rejectNote.trim() });
                }}
                className="flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition"
              >
                <ShieldX className="h-4 w-4" />
                {reject.isPending ? "Rejecting…" : "Confirm rejection"}
              </button>
              <button
                onClick={() => { setShowReject(false); setRejectNote(""); }}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-500 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {err && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 border border-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {err}
        </div>
      )}
    </div>
  );
}

// ─── History row ─────────────────────────────────────────────────────────────

function HistoryRow({ req }: { req: HistoryRequest }) {
  const cfg = STATUS_LABEL[req.status];
  const Icon = cfg.Icon;
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3">
      <Icon className={cn("h-4 w-4 shrink-0", req.status === "APPROVED" ? "text-emerald-600" : req.status === "REJECTED" ? "text-red-500" : "text-slate-400")} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 truncate">
          {req.valeter.firstName} {req.valeter.lastName}
          {req.valeter.payId && <span className="ml-1.5 text-xs font-normal text-slate-400">#{req.valeter.payId}</span>}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {req.newAccountName} · {maskSort(req.newSortCode)} / ••••{req.newAccountNumber.slice(-4)}
        </p>
        {req.notes && <p className="text-xs italic text-slate-400 truncate">"{req.notes}"</p>}
      </div>
      <div className="text-right shrink-0">
        <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold", cfg.colour)}>
          {cfg.label}
        </span>
        <p className="mt-0.5 text-[10px] text-slate-400">{fmtDate(req.createdAt)}</p>
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function BankChangeReview() {
  const [showHistory, setShowHistory] = useState(false);

  const { data: pending = [], isLoading, refetch } = trpc.bankChanges.listValeterRequested.useQuery(
    undefined,
    { refetchInterval: 60_000 },  // poll every minute
  );

  const { data: history = [], isLoading: histLoading } = trpc.bankChanges.listAllForOrg.useQuery(
    undefined,
    { enabled: showHistory },
  );

  const pendingCount = pending.length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-bold text-slate-900">Bank Details Changes</h2>
          {pendingCount > 0 && (
            <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold text-white">
              {pendingCount} pending
            </span>
          )}
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <History className="h-3.5 w-3.5" />
          {showHistory ? "Hide history" : "View history"}
          {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Pending requests */}
      {isLoading && (
        <p className="text-sm text-slate-400">Loading…</p>
      )}

      {!isLoading && pendingCount === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
          <p className="font-semibold text-slate-600">No pending bank change requests</p>
          <p className="mt-1 text-sm text-slate-400">Any requests from valeters will appear here for your review.</p>
        </div>
      )}

      {pending.map((req) => (
        <PendingCard
          key={req.id}
          req={req as unknown as Request}
          onDone={() => void refetch()}
        />
      ))}

      {/* History */}
      {showHistory && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">All requests</p>
          {histLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {!histLoading && history.length === 0 && (
            <p className="text-sm text-slate-400">No requests yet.</p>
          )}
          {history.map((req) => (
            <HistoryRow key={req.id} req={req as unknown as HistoryRequest} />
          ))}
        </div>
      )}
    </div>
  );
}
