"use client";

import { useState } from "react";
import { ListChecks, Clock, Loader2, CheckCircle2, PlusCircle } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { BookingCard, type BookingCardData } from "@/components/brand/booking-card";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Job extends BookingCardData {
  readyByTime: string;
  assignedTo: { firstName: string; lastName: string } | null;
}

type StatFilter = "ALL" | "PENDING" | "IN_PROGRESS" | "COMPLETED";

// ─── Clickable Stat Card ─────────────────────────────────────────────────────

function ClickableStatCard({
  icon: Icon,
  title,
  value,
  accent,
  active,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  value: number;
  accent: "navy" | "cyan" | "warning" | "success";
  active: boolean;
  onClick: () => void;
}) {
  const accentMap = {
    navy:    { icon: "bg-slate-100 text-slate-700",   ring: "ring-slate-400",   bg: "bg-slate-50" },
    warning: { icon: "bg-amber-50 text-amber-600",    ring: "ring-amber-400",   bg: "bg-amber-50/40" },
    cyan:    { icon: "bg-orange-50 text-orange-600",  ring: "ring-orange-400",  bg: "bg-orange-50/40" },
    success: { icon: "bg-emerald-50 text-emerald-600",ring: "ring-emerald-400", bg: "bg-emerald-50/40" },
  } as const;

  const colors = accentMap[accent];

  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-2xl border bg-white p-5 shadow-sm text-left w-full transition-all duration-150",
        active
          ? `ring-2 ${colors.ring} border-transparent ${colors.bg} shadow-md`
          : "border-slate-100 hover:border-slate-200 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <div className={cn("rounded-lg p-2.5", colors.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-4xl font-black tracking-tight text-slate-900">
        {value}
      </p>
      {active && (
        <p className="mt-1 text-xs font-semibold text-slate-400">Filtered ↓</p>
      )}
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function DealerDashboardClient({ initialJobs }: { initialJobs: Job[] }) {
  const [statFilter, setStatFilter] = useState<StatFilter>("ALL");

  // Stats — refresh every 30s
  const statsQuery = trpc.analytics.statCards.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const stats = statsQuery.data;

  // Jobs — refresh every 15s, filtered by stat card selection
  function jobQueryInput(f: StatFilter): { status?: BookingStatus } | undefined {
    if (f === "ALL") return undefined;
    return { status: f as BookingStatus };
  }

  const jobsQuery = trpc.bookings.list.useQuery(jobQueryInput(statFilter), {
    refetchInterval: 15_000,
    initialData: statFilter === "ALL" ? (initialJobs as never) : undefined,
  });

  const jobs = (jobsQuery.data as unknown as Job[] | undefined) ?? [];

  function handleStatClick(filter: StatFilter) {
    // Toggle off if already active
    setStatFilter((prev) => (prev === filter ? "ALL" : filter));
  }

  const listTitle =
    statFilter === "ALL"       ? "Today's bookings"
    : statFilter === "PENDING"     ? "Pending jobs"
    : statFilter === "IN_PROGRESS" ? "Jobs in progress"
    : "Completed jobs";

  return (
    <div>
      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ClickableStatCard
          icon={ListChecks}
          title="Today's Total"
          value={stats?.totalToday ?? 0}
          accent="navy"
          active={statFilter === "ALL"}
          onClick={() => setStatFilter("ALL")}
        />
        <ClickableStatCard
          icon={Clock}
          title="Pending"
          value={stats?.pending ?? 0}
          accent="warning"
          active={statFilter === "PENDING"}
          onClick={() => handleStatClick("PENDING")}
        />
        <ClickableStatCard
          icon={Loader2}
          title="In Progress"
          value={stats?.inProgress ?? 0}
          accent="cyan"
          active={statFilter === "IN_PROGRESS"}
          onClick={() => handleStatClick("IN_PROGRESS")}
        />
        <ClickableStatCard
          icon={CheckCircle2}
          title="Completed"
          value={stats?.completedToday ?? 0}
          accent="success"
          active={statFilter === "COMPLETED"}
          onClick={() => handleStatClick("COMPLETED")}
        />
      </div>

      {/* List header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-lg font-bold text-navy">
          {listTitle}
          {statFilter !== "ALL" && (
            <button
              onClick={() => setStatFilter("ALL")}
              className="ml-3 text-sm font-normal text-slate-400 underline underline-offset-2 hover:text-slate-600"
            >
              Clear filter
            </button>
          )}
        </h2>
      </div>

      {/* Jobs list */}
      {jobsQuery.isLoading ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-slate">
          Loading…
        </div>
      ) : jobs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white p-10 text-center text-slate">
          No bookings in this view.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <BookingCard key={job.id} booking={job} href={`/dealership/bookings/${job.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
