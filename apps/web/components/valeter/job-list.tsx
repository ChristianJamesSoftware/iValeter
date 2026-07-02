"use client";

import { useMemo, useState } from "react";
import type { BookingStatus } from "@ivaleter/db";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/react";
import { BookingCard, type BookingCardData } from "@/components/brand/booking-card";
import { Search, X } from "lucide-react";

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
  const [search, setSearch] = useState("");

  const query = trpc.bookings.list.useQuery(undefined, {
    initialData: initialJobs as never,
    refetchInterval: 20_000,
  });

  const jobs = (query.data ?? initialJobs) as unknown as Job[];

  const filtered = useMemo(() => {
    let result = jobs.filter((j) => {
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

    // Reg search — trim and uppercase to match how regs are stored
    const q = search.trim().toUpperCase();
    if (q) {
      result = result.filter(
        (j) =>
          j.vehicleReg.toUpperCase().includes(q) ||
          j.customerName.toUpperCase().includes(q),
      );
    }

    return result;
  }, [jobs, filter, search]);

  // DNC jobs always float to top of the list so valeters see them immediately
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.doNotClean && !b.doNotClean) return -1;
      if (!a.doNotClean && b.doNotClean) return 1;
      return 0;
    });
  }, [filtered]);

  return (
    <div>
      {/* Filter tabs */}
      <div className="-mx-4 -mt-4 mb-4 flex gap-2 overflow-x-auto bg-slate-900 px-4 pb-3 pt-1">
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

      {/* Reg search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reg or customer…"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center text-slate-400">
          {search ? `No jobs found for "${search}"` : "No jobs here right now."}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((job) => (
            <BookingCard
              key={job.id}
              booking={job}
              href={`/valeter/jobs/${job.id}`}
              variant="valeter"
            />
          ))}
        </div>
      )}
    </div>
  );
}
