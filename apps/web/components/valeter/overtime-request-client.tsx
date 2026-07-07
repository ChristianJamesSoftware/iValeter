"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { AlertTriangle, CheckCircle2, Clock, X } from "lucide-react";

const OTHER_VALUE = "__other__";

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "text-amber-400" },
  APPROVED: { label: "Approved", cls: "text-emerald-400" },
  DECLINED: { label: "Declined", cls: "text-red-400" },
};

export function OvertimeRequestClient() {
  const [showWarning, setShowWarning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("1");
  const [reasonId, setReasonId] = useState(""); // selected managed reason id, or __other__
  const [freeText, setFreeText] = useState("");
  const [done, setDone] = useState(false);

  const utils = trpc.useUtils();
  const { data: requests } = trpc.overtime.myRequests.useQuery();
  const { data: reasons } = trpc.overtimeReasons.list.useQuery();
  const submitMut = trpc.overtime.request.useMutation({
    onSuccess: () => {
      setDone(true);
      setShowForm(false);
      void utils.overtime.myRequests.invalidate();
    },
  });

  const hasReasons = (reasons?.length ?? 0) > 0;
  const isOther = reasonId === OTHER_VALUE || !hasReasons;
  const selectedReason = reasons?.find((r) => r.id === reasonId);
  // The final reason text sent to the API
  const resolvedReason = isOther ? freeText : (selectedReason?.label ?? "");
  const canSubmit = date && resolvedReason.trim().length >= 1;

  const inputCls =
    "h-10 w-full rounded-xl bg-white/10 px-3 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-orange-500/50";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitMut.mutateAsync({
      requestedDate: date,
      requestedHours: parseFloat(hours),
      reason: resolvedReason,
      reasonId: (!isOther && reasonId) ? reasonId : undefined,
    });
  }

  return (
    <div className="space-y-4 px-4 pb-6">
      {/* Request button */}
      {!showForm && !done && (
        <button
          onClick={() => setShowWarning(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600"
        >
          + Request Overtime
        </button>
      )}

      {/* Pre-approval warning modal */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 px-4 pb-6">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-base font-bold text-white">Overtime Pre-Approval Required</h2>
            </div>
            <p className="text-sm leading-relaxed text-white/70">
              Overtime must be <strong className="text-white">pre-approved by head office</strong> before
              it is worked. Any overtime completed without prior written approval{" "}
              <strong className="text-amber-400">will not be paid</strong>.
            </p>
            <p className="mt-3 text-sm text-white/50">
              By continuing, you confirm you understand this policy and are submitting a
              request for approval — not claiming payment for hours already worked.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => {
                  setShowWarning(false);
                  setShowForm(true);
                }}
                className="flex h-11 flex-1 items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600"
              >
                I understand — Continue
              </button>
              <button
                onClick={() => setShowWarning(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white/60 hover:bg-white/20"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Request form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white/10 px-5 py-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
            Overtime Request
          </p>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/50">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/50">Hours Requested</label>
            <select
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className={inputCls}
            >
              {[0.5, 1, 1.5, 2, 2.5, 3, 4].map((h) => (
                <option key={h} value={h}>
                  {h}h
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-white/50">Reason</label>
            {hasReasons && (
              <select
                value={reasonId}
                onChange={(e) => setReasonId(e.target.value)}
                required
                className={inputCls + " mb-2"}
              >
                <option value="" disabled>Select a reason…</option>
                {reasons!.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
                <option value={OTHER_VALUE}>Other — type below</option>
              </select>
            )}
            {/* Show free-text only when "Other" is selected or no managed reasons exist */}
            {isOther && (
              <textarea
                required
                rows={2}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Describe the reason…"
                className="w-full resize-none rounded-xl bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitMut.isPending || !canSubmit}
              className="flex h-10 flex-1 items-center justify-center rounded-xl bg-orange-500 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-60"
            >
              {submitMut.isPending ? "Submitting…" : "Submit Request"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-10 rounded-xl px-4 text-sm text-white/50 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {done && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/20 px-5 py-4">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-300">
            Request submitted — head office will be in touch shortly.
          </p>
        </div>
      )}

      {/* Previous requests */}
      {(requests?.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-2xl bg-white/10">
          <div className="border-b border-white/10 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/50">
              Previous Requests
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {requests!.map((r) => {
              const s = STATUS_STYLE[r.status] ?? { label: r.status, cls: "text-white/60" };
              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {fmtDate(r.requestedDate)}
                    </p>
                    <p className="text-xs text-white/40">{r.requestedHours}h — {r.reason.slice(0, 40)}{r.reason.length > 40 ? "…" : ""}</p>
                  </div>
                  <span className={`text-xs font-bold ${s.cls}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
