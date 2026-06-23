"use client";

import { useMemo, useState } from "react";
import type { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { cn, formatTime, minutesToHuman } from "@/lib/utils";
import { JobStatusBadge } from "@/components/brand/job-status-badge";
import { PriorityBadge } from "@/components/brand/priority-badge";
import { AssignModal } from "./assign-modal";

interface SiteOpt {
  id: string;
  name: string;
}
interface ValeterOpt {
  id: string;
  firstName: string;
  lastName: string;
  siteId: string | null;
  jobsToday: number;
  isActive: boolean;
}

const DEPARTMENTS = ["New Car Sales", "Used Car Sales", "Service"];

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function StatTile({
  label,
  value,
  tone = "dark",
}: {
  label: string;
  value: string | number;
  tone?: "dark" | "success" | "priority";
}) {
  return (
    <div
      className={cn(
        "rounded-xl p-4 text-white",
        tone === "success"
          ? "bg-emerald-500"
          : tone === "priority"
            ? "bg-orange-500"
            : "bg-slate-900",
      )}
    >
      <p className="text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wider opacity-60">
        {label}
      </p>
    </div>
  );
}

export function OpsCentre({
  sites,
  valeters,
}: {
  sites: SiteOpt[];
  valeters: ValeterOpt[];
}) {
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? "");
  const [assignBookingId, setAssignBookingId] = useState<string | null>(null);

  const stats = trpc.analytics.statCards.useQuery(
    { siteId: siteId || undefined },
    { refetchInterval: 15_000 },
  );
  const bookings = trpc.bookings.list.useQuery(
    { siteId: siteId || undefined },
    { refetchInterval: 12_000 },
  );

  const siteValeters = valeters.filter((v) => !siteId || v.siteId === siteId);

  const priorityCount = useMemo(
    () =>
      (bookings.data ?? []).filter(
        (b) => b.isPriority && b.status !== "COMPLETED",
      ).length,
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

  const siteName = sites.find((s) => s.id === siteId)?.name ?? "All sites";

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight text-slate-900">
            Operations Centre
          </h1>
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
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatTile label="Total Today" value={stats.data?.totalToday ?? 0} />
        <StatTile
          label="Pending"
          value={stats.data?.pending ?? 0}
          tone={priorityCount > 0 ? "priority" : "dark"}
        />
        <StatTile label="In Progress" value={stats.data?.inProgress ?? 0} />
        <StatTile
          label="Completed"
          value={stats.data?.completedToday ?? 0}
          tone="success"
        />
        <StatTile
          label="Avg Time"
          value={minutesToHuman(stats.data?.avgTimeMins ?? 0)}
        />
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
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
                        No jobs
                      </p>
                    ) : (
                      items.map((b) => (
                        <div
                          key={b.id}
                          className={cn(
                            "rounded-xl border bg-white p-3.5 shadow-sm transition-all hover:border-orange-200 hover:shadow-md",
                            b.isPriority
                              ? "border-l-4 border-l-orange-500 bg-orange-50/30"
                              : "border-slate-100",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-lg font-black tracking-widest text-slate-900">
                              {b.vehicleReg}
                            </span>
                            {b.isPriority ? (
                              <PriorityBadge />
                            ) : (
                              <JobStatusBadge
                                status={b.status as BookingStatus}
                              />
                            )}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-400">
                            {b.customerName} · {b.serviceType.name}
                          </p>
                          <div className="mt-2.5 flex items-center justify-between border-t border-slate-50 pt-2.5">
                            <span className="text-xs font-medium text-slate-600">
                              {formatTime(b.readyByTime)}
                            </span>
                            {b.assignedTo ? (
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                                {initials(
                                  b.assignedTo.firstName,
                                  b.assignedTo.lastName,
                                )}
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
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Valeter workload */}
        <aside>
          <h3 className="mb-3 text-sm font-bold text-slate-900">Valeters</h3>
          <div className="space-y-2">
            {siteValeters.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">
                No valeters at this site
              </p>
            ) : (
              siteValeters.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {initials(v.firstName, v.lastName)}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {v.firstName} {v.lastName}
                  </span>
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      v.isActive ? "bg-emerald-500" : "bg-slate-300",
                    )}
                  />
                  <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {v.jobsToday}
                  </span>
                </div>
              ))
            )}
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
