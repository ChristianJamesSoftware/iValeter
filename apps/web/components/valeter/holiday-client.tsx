"use client";

import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_STYLE = {
  PENDING: "bg-slate/10 text-slate",
  APPROVED: "bg-success/15 text-success",
  REJECTED: "bg-danger/10 text-danger",
} as const;

export function HolidayClient() {
  const utils = trpc.useUtils();
  const requests = trpc.holiday.myRequests.useQuery();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const submit = trpc.holiday.submitRequest.useMutation({
    onSuccess: async () => {
      setStartDate("");
      setEndDate("");
      setReason("");
      await utils.holiday.myRequests.invalidate();
    },
  });

  const canSubmit = startDate && endDate && !submit.isPending;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-white p-4">
        <h2 className="mb-3 font-heading font-bold text-navy">New request</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Start date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-12 w-full rounded-lg border border-line bg-white px-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              End date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-12 w-full rounded-lg border border-line bg-white px-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-navy">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Family holiday"
              className="h-12 w-full rounded-lg border border-line bg-white px-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
            />
          </div>
          {submit.error && (
            <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
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
              })
            }
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-cyan font-heading font-semibold text-navy transition hover:bg-cyan-600 disabled:opacity-60"
          >
            <CalendarPlus className="h-5 w-5" />
            {submit.isPending ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-heading font-bold text-navy">My requests</h2>
        {requests.isLoading ? (
          <p className="text-slate">Loading…</p>
        ) : !requests.data || requests.data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white p-6 text-center text-slate">
            No requests yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {requests.data.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-line bg-white p-3"
              >
                <div>
                  <p className="font-medium text-navy">
                    {formatDate(r.startDate)} → {formatDate(r.endDate)}
                  </p>
                  {r.reason && (
                    <p className="text-sm text-slate">{r.reason}</p>
                  )}
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    STATUS_STYLE[r.status as keyof typeof STATUS_STYLE] ?? "bg-slate-100 text-slate-500",
                  )}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
