"use client";

import { useMemo, useState } from "react";
import type { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { cn, formatTime, minutesToHuman } from "@/lib/utils";
import { JobStatusBadge } from "@/components/brand/job-status-badge";
import { PriorityBadge } from "@/components/brand/priority-badge";
import { AssignModal } from "./assign-modal";
import { AlertTriangle, CheckCircle2, ClipboardCheck } from "lucide-react";

interface SiteOpt  { id: string; name: string }
interface ValeterOpt {
  id: string; firstName: string; lastName: string;
  siteId: string | null; jobsToday: number; isActive: boolean;
}

const DEPARTMENTS = ["New Car Sales", "Used Car Sales", "Service"];

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function StatTile({ label, value, tone = "dark" }: {
  label: string; value: string | number; tone?: "dark" | "success" | "priority" | "alert";
}) {
  return (
    <div className={cn(
      "rounded-xl p-4 text-white",
      tone === "success" ? "bg-emerald-500"
      : tone === "priority" ? "bg-orange-500"
      : tone === "alert" ? "bg-red-500"
      : "bg-slate-900",
    )}>
      <p className="text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

export function OpsCentre({ sites, valeters }: { sites: SiteOpt[]; valeters: ValeterOpt[] }) {
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? "");
  const [assignBookingId, setAssignBookingId] = useState<string | null>(null);
  const [visitSigned, setVisitSigned] = useState(false);

  // Live queries
  const stats   = trpc.analytics.statCards.useQuery({ siteId: siteId || undefined }, { refetchInterval: 15_000 });
  const bookings = trpc.bookings.list.useQuery({ siteId: siteId || undefined }, { refetchInterval: 12_000 });
  const clockQ  = trpc.users.clockStatusToday.useQuery({ siteId: siteId || undefined }, { refetchInterval: 60_000 });

  const siteValeters = valeters.filter((v) => !siteId || v.siteId === siteId);
  const siteName = sites.find((s) => s.id === siteId)?.name ?? "All sites";

  const priorityCount = useMemo(
    () => (bookings.data ?? []).filter((b) => b.isPriority && b.status !== "COMPLETED").length,
    [bookings.data],
  );

  const byDept = useMemo(() => {
    const map = new Map<string, NonNullable<typeof bookings.data>>();
    for (const dept of DEPARTMENTS) map.set(dept, []);
    for (const b of bookings.data ?? []) {
      const key = b.department?.name ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return map;
  }, [bookings.data]);

  // Clock status — merge with valeter list
  const clockMap = useMemo(() => {
    const m = new Map<string, { isClockedIn: boolean; isLate: boolean; clockedInAt: string | null }>();
    for (const c of clockQ.data ?? []) {
      m.set(c.id, {
        isClockedIn: c.isClockedIn,
        isLate: c.isLate,
        clockedInAt: c.clockedInAt ? new Date(c.clockedInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : null,
      });
    }
    return m;
  }, [clockQ.data]);

  const lateValeters = (clockQ.data ?? []).filter((c) => c.isLate);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight text-slate-900">Operations Centre</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Live · {siteName}
          </p>
        </div>
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="h-11 rounded-lg border border-slate-200 bg-white px-4 font-heading font-semibold text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        >
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Late valeter alert banner */}
      {lateValeters.length > 0 && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="font-semibold text-red-900">
              {lateValeters.length} valeter{lateValeters.length > 1 ? "s" : ""} not clocked in past 8:15am
            </p>
            <p className="mt-0.5 text-sm text-red-700">
              {lateValeters.map((v) => `${v.firstName} ${v.lastName}`).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Team leader daily visit sign-off */}
      <div className={cn(
        "mb-5 flex items-center justify-between rounded-xl border px-5 py-3",
        visitSigned
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50",
      )}>
        <div className="flex items-center gap-3">
          <ClipboardCheck className={cn("h-5 w-5 shrink-0", visitSigned ? "text-emerald-600" : "text-amber-500")} />
          <div>
            <p className={cn("text-sm font-semibold", visitSigned ? "text-emerald-900" : "text-amber-900")}>
              Team Leader Morning Visit
            </p>
            <p className="text-xs text-slate">
              {visitSigned
                ? "Completed — site visited, jobs reviewed, issues noted."
                : "Not yet signed off today. Visit each manager, review vehicles in for the day, note any issues."}
            </p>
          </div>
        </div>
        {!visitSigned ? (
          <button
            onClick={() => setVisitSigned(true)}
            className="ml-4 shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Sign Off Visit
          </button>
        ) : (
          <CheckCircle2 className="ml-4 h-6 w-6 shrink-0 text-emerald-500" />
        )}
      </div>

      {/* Stat tiles */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Total Today"  value={stats.data?.totalToday ?? 0} />
        <StatTile label="Pending"      value={stats.data?.pending ?? 0}       tone={priorityCount > 0 ? "priority" : "dark"} />
        <StatTile label="In Progress"  value={stats.data?.inProgress ?? 0} />
        <StatTile label="Completed"    value={stats.data?.completedToday ?? 0} tone="success" />
        <StatTile label="Avg Time"     value={minutesToHuman(stats.data?.avgTimeMins ?? 0)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Live job board */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {DEPARTMENTS.map((dept) => {
              const items = byDept.get(dept) ?? [];
              return (
                <div key={dept}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">{dept}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">No jobs</p>
                    ) : items.map((b) => (
                      <div
                        key={b.id}
                        className={cn(
                          "rounded-xl border bg-white p-3.5 shadow-sm transition-all hover:border-orange-200 hover:shadow-md",
                          b.isPriority ? "border-l-4 border-l-orange-500 bg-orange-50/30" : "border-slate-100",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-lg font-black tracking-widest text-slate-900">{b.vehicleReg}</span>
                          {b.isPriority ? <PriorityBadge /> : <JobStatusBadge status={b.status as BookingStatus} />}
                        </div>
                        <p className="mt-1 truncate text-xs text-slate-400">{b.customerName} · {b.serviceType.name}</p>
                        <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2.5">
                          <span className="text-xs font-medium text-slate-600">{formatTime(b.readyByTime)}</span>
                          {b.assignedTo ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                              {initials(b.assignedTo.firstName, b.assignedTo.lastName)}
                            </span>
                          ) : (
                            <button
                              onClick={() => setAssignBookingId(b.id)}
                              className="rounded-md bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-orange-600"
                            >
                              Assign
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Valeter attendance sidebar */}
        <aside>
          <h3 className="mb-3 text-sm font-bold text-slate-900">Valeters</h3>
          <div className="space-y-2">
            {siteValeters.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">No valeters at this site</p>
            ) : siteValeters.map((v) => {
              const cs = clockMap.get(v.id);
              const isClockedIn = cs?.isClockedIn ?? false;
              const isLate = cs?.isLate ?? false;
              const clockedAt = cs?.clockedInAt;
              return (
                <div
                  key={v.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm",
                    isLate ? "border-red-200 bg-red-50/40" : isClockedIn ? "border-emerald-200" : "border-slate-100",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {initials(v.firstName, v.lastName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{v.firstName} {v.lastName}</p>
                    <p className="text-[10px] text-slate-400">
                      {isClockedIn ? `In at ${clockedAt}` : isLate ? "Not on site — past 8:15" : "Not yet clocked in"}
                    </p>
                  </div>
                  {/* Status dot */}
                  <span className={cn(
                    "h-2.5 w-2.5 shrink-0 rounded-full",
                    isLate ? "bg-red-500" : isClockedIn ? "bg-emerald-500" : "bg-slate-300",
                  )} title={isLate ? "Late" : isClockedIn ? "On site" : "Not clocked in"} />
                  <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{v.jobsToday}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {assignBookingId && (
        <AssignModal
          bookingId={assignBookingId}
          valeters={siteValeters}
          onClose={() => setAssignBookingId(null)}
        />
      )}
    </div>
  );
}
