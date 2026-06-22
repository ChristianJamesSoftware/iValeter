"use client";

import { useMemo, useState } from "react";
import {
  ListChecks,
  Clock,
  Loader2,
  CheckCircle2,
  Timer,
} from "lucide-react";
import type { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { cn, formatTime, minutesToHuman } from "@/lib/utils";
import { StatCard } from "@/components/brand/stat-card";
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

  const siteValeters = valeters.filter(
    (v) => !siteId || v.siteId === siteId,
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

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-navy">
            Operations Centre
          </h1>
          <p className="mt-1 text-sm text-slate">
            Live job board across your sites
          </p>
        </div>
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="h-11 rounded-lg border border-line bg-white px-4 font-heading font-semibold text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={ListChecks} title="Total Today" value={stats.data?.totalToday ?? 0} accent="navy" />
        <StatCard icon={Clock} title="Pending" value={stats.data?.pending ?? 0} accent="warning" />
        <StatCard icon={Loader2} title="In Progress" value={stats.data?.inProgress ?? 0} accent="cyan" />
        <StatCard icon={CheckCircle2} title="Completed" value={stats.data?.completedToday ?? 0} accent="success" />
        <StatCard icon={Timer} title="Avg Time" value={minutesToHuman(stats.data?.avgTimeMins ?? 0)} accent="navy" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Live job board */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {DEPARTMENTS.map((dept) => {
              const items = byDept.get(dept) ?? [];
              return (
                <div key={dept} className="rounded-xl bg-offwhite">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <h3 className="font-heading text-sm font-bold text-navy">
                      {dept}
                    </h3>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-line bg-white p-4 text-center text-xs text-slate">
                        No jobs
                      </p>
                    ) : (
                      items.map((b) => (
                        <div
                          key={b.id}
                          className={cn(
                            "rounded-lg border bg-white p-3 shadow-sm",
                            b.isPriority
                              ? "border-2 border-danger animate-priority-border"
                              : "border-line",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-heading font-bold text-navy">
                              {b.vehicleReg}
                            </span>
                            {b.isPriority && <PriorityBadge />}
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate">
                            {b.customerName} · {b.serviceType.name}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <JobStatusBadge status={b.status as BookingStatus} />
                            <span className="text-xs text-slate">
                              {formatTime(b.readyByTime)}
                            </span>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-slate">
                              {b.assignedTo
                                ? `${b.assignedTo.firstName} ${b.assignedTo.lastName}`
                                : "Unassigned"}
                            </span>
                            {(b.status === "PENDING" || !b.assignedTo) && (
                              <button
                                onClick={() => setAssignBookingId(b.id)}
                                className="rounded-md bg-cyan px-2.5 py-1 text-xs font-semibold text-navy hover:bg-cyan-600"
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
          <h3 className="mb-3 font-heading text-sm font-bold text-navy">
            Valeter Workload
          </h3>
          <div className="space-y-2">
            {siteValeters.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line bg-white p-4 text-center text-xs text-slate">
                No valeters at this site
              </p>
            ) : (
              siteValeters.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between rounded-lg border border-line bg-white p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        v.isActive ? "bg-success" : "bg-line",
                      )}
                    />
                    <span className="text-sm font-medium text-navy">
                      {v.firstName} {v.lastName}
                    </span>
                  </div>
                  <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs font-bold text-navy">
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
