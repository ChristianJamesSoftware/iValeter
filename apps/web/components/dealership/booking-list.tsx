"use client";

import { useState } from "react";
import type { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { BookingCard, type BookingCardData } from "@/components/brand/booking-card";

interface Job extends BookingCardData {
  readyByTime: string;
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
  { key: "ALL",         label: "All" },
  { key: "PRIORITY",    label: "Priority" },
  { key: "PENDING",     label: "Pending" },
  { key: "ASSIGNED",    label: "Assigned" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "QC_CHECK",    label: "QC Check" },
  { key: "COMPLETED",   label: "Completed" },
  { key: "CANCELLED",   label: "Cancelled" },
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
      {/* Filter tabs */}
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
        <div className="space-y-3">
          {jobs.map((j) => (
            <BookingCard
              key={j.id}
              booking={j}
              href={`/dealership/bookings/${j.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
