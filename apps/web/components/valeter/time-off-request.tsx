"use client";

import { useState } from "react";
import { CalendarPlus, ChevronDown, ChevronUp, CheckCircle2, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLE = {
  PENDING:  "bg-amber-100/60 text-amber-700",
  APPROVED: "bg-emerald-100/60 text-emerald-700",
  REJECTED: "bg-red-100/60 text-red-600",
} as const;

const STATUS_LABEL = {
  PENDING:  "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
} as const;

export function TimeOffRequest() {
  const utils = trpc.useUtils();
  const requests = trpc.holiday.myRequests.useQuery();

  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [replacementOrganised, setReplacementOrganised] = useState<boolean | null>(null);
  const [replacementName, setReplacementName] = useState("");

  const submit = trpc.holiday.submitRequest.useMutation({
    onSuccess: async () => {
      setStartDate("");
      setEndDate("");
      setReason("");
      setReplacementOrganised(null);
      setReplacementName("");
      setOpen(false);
      await utils.holiday.myRequests.invalidate();
    },
  });

  const canSubmit =
    startDate &&
    endDate &&
    replacementOrganised !== null &&
    (!replacementOrganised || replacementName.trim().length > 0) &&
    !submit.isPending;

  return (
    <div className="rounded-2xl bg-white/10">
      {/* Header — toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <CalendarPlus className="h-4 w-4 text-orange-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Time Off Request
          </p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-white/40" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/40" />
        )}
      </button>

      {open && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4 space-y-4">
          {/* Form */}
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/50 uppercase tracking-wider">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-11 w-full rounded-xl bg-white/10 px-3.5 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/50 uppercase tracking-wider">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-11 w-full rounded-xl bg-white/10 px-3.5 text-sm text-white outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-white/50 uppercase tracking-wider">
                Reason (optional)
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Personal commitment"
                className="h-11 w-full rounded-xl bg-white/10 px-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            {/* Replacement question */}
            <div>
              <p className="mb-2 text-sm font-semibold text-white/80">
                Have you organised a replacement for this time off?
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReplacementOrganised(true)}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition",
                    replacementOrganised === true
                      ? "border-emerald-400 bg-emerald-500/20 text-emerald-300"
                      : "border-white/20 bg-white/10 text-white/70 hover:bg-white/20",
                  )}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => { setReplacementOrganised(false); setReplacementName(""); }}
                  className={cn(
                    "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition",
                    replacementOrganised === false
                      ? "border-amber-400 bg-amber-500/20 text-amber-300"
                      : "border-white/20 bg-white/10 text-white/70 hover:bg-white/20",
                  )}
                >
                  <Clock className="h-4 w-4" />
                  Not yet
                </button>
              </div>
            </div>

            {/* Replacement name — only if yes */}
            {replacementOrganised === true && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Replacement's name
                </label>
                <input
                  type="text"
                  value={replacementName}
                  onChange={(e) => setReplacementName(e.target.value)}
                  placeholder="Who is covering for you?"
                  className="h-11 w-full rounded-xl bg-white/10 px-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            )}

            {submit.error && (
              <p className="rounded-xl bg-red-500/20 px-3.5 py-2.5 text-sm text-red-300">
                {submit.error.message}
              </p>
            )}

            <button
              disabled={!canSubmit}
              onClick={() =>
                submit.mutate({
                  startDate: new Date(startDate),
                  endDate: new Date(endDate),
                  reason: reason.trim() || undefined,
                  replacementOrganised: replacementOrganised ?? false,
                  replacementName: replacementOrganised && replacementName.trim() ? replacementName.trim() : undefined,
                })
              }
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
            >
              <CalendarPlus className="h-4 w-4" />
              {submit.isPending ? "Submitting…" : "Submit Request"}
            </button>
          </div>

          {/* Past requests */}
          {requests.data && requests.data.length > 0 && (
            <div className="mt-2 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/40">My Requests</p>
              {requests.data.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {formatDate(r.startDate)} → {formatDate(r.endDate)}
                    </p>
                    {r.reason && <p className="text-xs text-white/40">{r.reason}</p>}
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      STATUS_STYLE[r.status as keyof typeof STATUS_STYLE] ?? "bg-white/10 text-white/60",
                    )}
                  >
                    {STATUS_LABEL[r.status as keyof typeof STATUS_LABEL] ?? r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
