"use client";

import { useMemo, useState } from "react";
import type { BookingStatus } from "@ivaleter/db";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/react";
import { BookingCard, type BookingCardData } from "@/components/brand/booking-card";

type Filter = "ALL" | "PRIORITY" | "PENDING" | "IN_PROGRESS";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "PRIORITY", label: "Priority" },
  { key: "PENDING", label: "To Do" },
  { key: "IN_PROGRESS", label: "In Progress" },
];

interface Job extends BookingCardData {
  readyByTime: string;
}

export function ValeterJobList({ initialJobs }: { initialJobs: Job[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const query = trpc.bookings.list.useQuery(undefined, {
    initialData: initialJobs as never,
    refetchInterval: 20_000,
  });

  const jobs = (query.data ?? initialJobs) as unknown as Job[];

  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (filter === "ALL") return true;
      if (filter === "PRIORITY") return j.isPriority;
      if (filter === "PENDING")
        return (
          (j.status as BookingStatus) === "ASSIGNED" ||
          (j.status as BookingStatus) === "PENDING"
        );
      if (filter === "IN_PROGRESS")
        return (
          (j.status as BookingStatus) === "IN_PROGRESS" ||
          (j.status as BookingStatus) === "QC_CHECK"
        );
      return true;
    });
  }, [jobs, filter]);

  return (
    <div>
      <div className="-mx-4 -mt-4 mb-4 flex gap-2 overflow-x-auto bg-slate-900 px-4 pb-4 pt-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm transition",
              filter === f.key
                ? "bg-white font-bold text-slate-900 shadow-sm"
                : "border border-white/20 bg-white/10 font-semibold text-white/70",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
          No jobs here right now.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <BookingCard
              key={job.id}
              booking={job}
              href={`/valeter/jobs/${job.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
