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
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition",
              filter === f.key
                ? "bg-navy text-white"
                : "bg-white text-slate border border-line",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-slate">
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
