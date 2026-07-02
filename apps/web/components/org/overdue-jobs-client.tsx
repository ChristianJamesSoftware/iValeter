"use client";

import React, { useState } from "react";
import {
  AlertTriangle, Clock, User, CalendarDays, RefreshCw, ChevronDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@ivaleter/db";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OverdueJob {
  id: string;
  vehicleReg: string;
  customerName: string;
  status: BookingStatus;
  readyByTime: string;
  rollCount: number;
  lastRolledAt: string | null;
  site: { id: string; name: string };
  department: { id: string; name: string };
  serviceType: { id: string; name: string };
  assignedTo: { id: string; firstName: string; lastName: string } | null;
}

interface Valeter {
  id: string;
  firstName: string;
  lastName: string;
  siteId: string | null;
}

interface Props {
  initialJobs: OverdueJob[];
  valeters: Valeter[];
}

// ─── How long ago helper ──────────────────────────────────────────────────────

function daysAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

// ─── Single job card ──────────────────────────────────────────────────────────

function OverdueCard({
  job,
  valeters,
  onReallocated,
}: {
  job: OverdueJob;
  valeters: Valeter[];
  onReallocated: () => void;
}) {
  const [open, setOpen]           = useState(false);
  const [valeterId, setValeterId] = useState(job.assignedTo?.id ?? "");
  const [newDate, setNewDate]     = useState(() => {
    // Default new date = today
    return new Date().toISOString().slice(0, 10);
  });
  const [error, setError] = useState("");

  const reallocate = trpc.bookings.reallocate.useMutation({
    onSuccess: () => { setOpen(false); onReallocated(); },
    onError: (e) => setError(e.message),
  });

  const siteValeters = valeters.filter(
    (v) => !v.siteId || v.siteId === job.site.id,
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newDate) { setError("Please pick a new date"); return; }
    setError("");
    reallocate.mutate({
      bookingId: job.id,
      valeterId: valeterId || undefined,
      newReadyByTime: new Date(newDate + "T12:00:00").toISOString(),
    });
  }

  const INPUT = "h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30";
  const LABEL = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";

  return (
    <div className={cn(
      "rounded-2xl border bg-white shadow-sm transition-all",
      job.rollCount > 0 ? "border-orange-300" : "border-red-300",
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-bold tracking-widest text-navy">
              {job.vehicleReg}
            </span>
            {/* Roll badge */}
            {job.rollCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-700">
                <RefreshCw className="h-3 w-3" /> Rolled ×{job.rollCount}
              </span>
            )}
            {/* Status */}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {job.status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{job.customerName}</p>

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-red-400" />
              Was due <strong className="text-red-600 ml-1">{daysAgo(job.readyByTime)}</strong>
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(job.readyByTime).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
            <span>{job.site.name} · {job.serviceType.name}</span>
            {job.assignedTo ? (
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {job.assignedTo.firstName} {job.assignedTo.lastName}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-500">
                <User className="h-3.5 w-3.5" /> Unassigned
              </span>
            )}
            {job.lastRolledAt && (
              <span className="text-orange-500">
                Last rolled {daysAgo(job.lastRolledAt)}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-1 shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white hover:bg-navy/90"
        >
          Reallocate
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {/* Reallocation form */}
      {open && (
        <form onSubmit={handleSubmit} className="border-t border-line px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={LABEL}>Assign Valeter</label>
              <select value={valeterId} onChange={(e) => setValeterId(e.target.value)} className={INPUT}>
                <option value="">Keep current{job.assignedTo ? ` (${job.assignedTo.firstName} ${job.assignedTo.lastName})` : " (unassigned)"}</option>
                {siteValeters.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.firstName} {v.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>New Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={newDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setNewDate(e.target.value)}
                className={INPUT}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={reallocate.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-5 py-2 text-sm font-bold text-white hover:bg-navy/90 disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", reallocate.isPending && "animate-spin")} />
              {reallocate.isPending ? "Saving…" : "Confirm Reallocation"}
            </button>
            <p className="ml-1 text-xs text-slate-400">
              This will add a roll flag to the job card
            </p>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function OverdueJobsClient({ initialJobs, valeters }: Props) {
  const utils = trpc.useUtils();
  const query = trpc.bookings.listOverdue.useQuery(undefined, {
    initialData: initialJobs as never,
    refetchInterval: 60_000,
  });

  const jobs = (query.data ?? initialJobs) as unknown as OverdueJob[];

  function refetch() {
    void utils.bookings.listOverdue.invalidate();
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
        <AlertTriangle className="mx-auto mb-3 h-9 w-9 text-slate-300" />
        <p className="font-semibold text-slate-500">No overdue jobs</p>
        <p className="mt-1 text-sm text-slate-400">All jobs are within the 2-day window</p>
      </div>
    );
  }

  // Sort: most rolled first, then oldest first
  const sorted = [...jobs].sort((a, b) => {
    if (b.rollCount !== a.rollCount) return b.rollCount - a.rollCount;
    return new Date(a.readyByTime).getTime() - new Date(b.readyByTime).getTime();
  });

  const rolledCount    = jobs.filter((j) => j.rollCount > 0).length;
  const unrolledCount  = jobs.length - rolledCount;

  return (
    <div>
      {/* Summary bar */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm">
          <span className="font-bold text-red-700">{jobs.length}</span>
          <span className="ml-1 text-red-500">overdue job{jobs.length !== 1 ? "s" : ""}</span>
        </div>
        {rolledCount > 0 && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm">
            <span className="font-bold text-orange-700">{rolledCount}</span>
            <span className="ml-1 text-orange-500">already rolled</span>
          </div>
        )}
        {unrolledCount > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm">
            <span className="font-bold text-amber-700">{unrolledCount}</span>
            <span className="ml-1 text-amber-500">first occurrence</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {sorted.map((job) => (
          <OverdueCard
            key={job.id}
            job={job}
            valeters={valeters}
            onReallocated={refetch}
          />
        ))}
      </div>
    </div>
  );
}
