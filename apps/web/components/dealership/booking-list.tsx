"use client";

import type { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { formatTime } from "@/lib/utils";
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

export function DealershipBookingList({ initialJobs }: { initialJobs: Job[] }) {
  const query = trpc.bookings.list.useQuery(undefined, {
    refetchInterval: 15_000,
  });

  // Filter the live data down to today to match the server-rendered set.
  const data = (query.data as unknown as Job[] | undefined) ?? initialJobs;
  const jobs = data.length > 0 ? data : initialJobs;

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-slate">
        No bookings yet today.
      </div>
    );
  }

  return (
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
  );
}
