"use client";

import { useState } from "react";
import type { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { formatTime, cn } from "@/lib/utils";
import { JobStatusBadge } from "@/components/brand/job-status-badge";
import { PriorityBadge } from "@/components/brand/priority-badge";

interface Job {
  id: string;
  vehicleReg: string;
  customerName: string;
  status: BookingStatus;
  isPriority: boolean;
  readyByTime: string;
  serviceType: { name: string };
  assignedTo: { firstName: string; lastName: string } | null;
}

type Filter =
  | "ALL"
  | "PRIORITY"
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "QC_CHECK"
  | "COMPLETED"
  | "CANCELLED";

const TABS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PRIORITY", label: "Priority" },
  { key: "PENDING", label: "Pending" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "QC_CHECK", label: "QC Check" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

function queryInput(
  filter: Filter,
): { status?: BookingStatus; isPriority?: boolean } | undefined {
  if (filter === "ALL") return undefined;
  if (filter === "PRIORITY") return { isPriority: true };
  return { status: filter as BookingStatus };
}

export function DealershipBookingList({ initialJobs }: { initialJobs: Job[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const query = trpc.bookings.list.useQuery(queryInput(filter), {
    refetchInterval: 15_000,
    initialData: filter === "ALL" ? (initialJobs as never) : undefined,
  });

  const jobs = (query.data as unknown as Job[] | undefined) ?? [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
              filter === t.key
                ? "border-navy bg-navy text-white"
                : "border-line bg-white text-slate hover:bg-offwhite",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {query.isLoading ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-slate">
          Loading…
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-slate">
          No bookings in this view.
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-navy">
                    {j.vehicleReg}
                  </span>
                  {j.isPriority && <PriorityBadge />}
                </div>
                <p className="truncate text-sm text-slate">
                  {j.customerName} · {j.serviceType.name}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <JobStatusBadge status={j.status} />
                <span className="text-xs text-slate">
                  {j.assignedTo
                    ? `${j.assignedTo.firstName} ${j.assignedTo.lastName}`
                    : "Unassigned"}{" "}
                  · {formatTime(j.readyByTime)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
