"use client";

/**
 * Shared CalendarTab + JobsTab used by both:
 *   - OpsCentre  (live site picker, same page)
 *   - SiteViewClient  (dealership → site picker)
 *
 * Both tabs accept a single `siteId` prop.
 */

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Star,
  Filter,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn, formatDateTime } from "@/lib/utils";
import { JobStatusBadge } from "@/components/brand/job-status-badge";
import type { BookingStatus } from "@ivaleter/db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export const STATUS_DOT: Record<BookingStatus, string> = {
  PENDING:     "bg-slate-400",
  ASSIGNED:    "bg-blue-400",
  IN_PROGRESS: "bg-orange-400",
  QC_CHECK:    "bg-purple-400",
  COMPLETED:   "bg-emerald-400",
  CANCELLED:   "bg-red-400",
};

const STATUS_ORDER: Record<BookingStatus, number> = {
  IN_PROGRESS: 0,
  ASSIGNED:    1,
  QC_CHECK:    2,
  PENDING:     3,
  COMPLETED:   4,
  CANCELLED:   5,
};

const ALL_STATUSES: (BookingStatus | "ALL")[] = [
  "ALL", "PENDING", "ASSIGNED", "IN_PROGRESS", "QC_CHECK", "COMPLETED", "CANCELLED",
];

function mondayForOffset(weekOffset: number): Date {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diff + weekOffset * 7);
  return monday;
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatWeekLabel(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${monday.toLocaleDateString("en-GB", opts)} – ${sunday.toLocaleDateString("en-GB", opts)}`;
}

// ─── Calendar Tab ─────────────────────────────────────────────────────────────

export function CalendarTab({ siteId }: { siteId: string }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [deptFilter, setDeptFilter] = useState("All");

  const monday = useMemo(() => mondayForOffset(weekOffset), [weekOffset]);
  const sunday = useMemo(() => {
    const d = new Date(monday);
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [monday]);

  const { data: bookings, isLoading } = trpc.bookings.list.useQuery(
    { siteId, dateFrom: monday, dateTo: sunday }
  );

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    }),
  [monday]);

  const depts = useMemo(() => {
    const names = new Set((bookings ?? []).map((b) => b.department?.name ?? "Unassigned"));
    return ["All", ...Array.from(names).sort()];
  }, [bookings]);

  const filtered = useMemo(() =>
    (bookings ?? []).filter(
      (b) => deptFilter === "All" || b.department?.name === deptFilter
    ),
  [bookings, deptFilter]);

  const byDay = useMemo(() =>
    days.map((day) => ({
      date: day,
      jobs: filtered
        .filter((b) => sameDay(new Date(b.readyByTime), day))
        .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    })),
  [days, filtered]);

  const today = new Date();

  return (
    <div className="space-y-4">
      {/* Week nav + dept filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4D1CA] bg-white text-slate-500 hover:bg-slate-50 transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="h-8 px-3 rounded-lg border border-[#D4D1CA] bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            Today
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4D1CA] bg-white text-slate-500 hover:bg-slate-50 transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-semibold text-[#1C1A16]">{formatWeekLabel(monday)}</span>
        </div>
        {depts.length > 2 && (
          <div className="flex items-center gap-1 flex-wrap">
            {depts.map((d) => (
              <button
                key={d}
                onClick={() => setDeptFilter(d)}
                className={cn(
                  "h-7 px-3 rounded-full text-xs font-medium transition",
                  deptFilter === d
                    ? "bg-[#E8650A] text-white"
                    : "border border-[#D4D1CA] bg-white text-slate-500 hover:bg-slate-50"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading calendar…
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {byDay.map(({ date, jobs }, i) => {
            const isToday = sameDay(date, today);
            const isPast  = date < today && !isToday;
            return (
              <div key={i} className="min-w-0">
                <div className={cn(
                  "mb-1 flex flex-col items-center rounded-lg py-1.5",
                  isToday ? "bg-[#E8650A]/10" : ""
                )}>
                  <p className={cn(
                    "text-[9px] font-bold uppercase tracking-widest",
                    isToday ? "text-[#E8650A]" : "text-slate-400"
                  )}>{DAY_LABELS[i]}</p>
                  <p className={cn(
                    "text-sm font-black",
                    isToday ? "text-[#E8650A]" : isPast ? "text-slate-300" : "text-[#1C1A16]"
                  )}>{date.getDate()}</p>
                </div>
                <div className="space-y-1">
                  {jobs.length === 0 ? (
                    <div className="h-10 rounded-lg border border-dashed border-[#E8E6E0]" />
                  ) : (
                    jobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/org/bookings/${job.id}`}
                        className={cn(
                          "block rounded-lg border p-1.5 text-[10px] leading-tight transition hover:shadow-sm",
                          job.status === "COMPLETED"
                            ? "border-emerald-100 bg-emerald-50/60"
                            : job.status === "CANCELLED"
                            ? "border-slate-100 bg-slate-50 opacity-60"
                            : job.isPriority
                            ? "border-[#E8650A]/30 bg-[#E8650A]/5"
                            : "border-[#E8E6E0] bg-white"
                        )}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", STATUS_DOT[job.status])} />
                          <span className="font-bold text-[#1C1A16] truncate">{job.vehicleReg}</span>
                        </div>
                        <p className="text-slate-400 truncate">{job.serviceType.name}</p>
                        {job.assignedTo && (
                          <p className="text-slate-400 truncate">
                            {job.assignedTo.firstName[0]}.{job.assignedTo.lastName}
                          </p>
                        )}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500 pt-1">
        {(Object.entries(STATUS_DOT) as [BookingStatus, string][]).map(([s, dot]) => (
          <span key={s} className="flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", dot)} />
            {s.replace("_", " ")}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Jobs Tab ─────────────────────────────────────────────────────────────────

export function JobsTab({ siteId }: { siteId: string }) {
  const [search, setSearch]                 = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter]     = useState<BookingStatus | "ALL">("ALL");
  const [timer, setTimer]                   = useState<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(val: string) {
    setSearch(val);
    if (timer) clearTimeout(timer);
    setTimer(setTimeout(() => setDebouncedSearch(val.trim()), 400));
  }

  const { data: bookings, isLoading, isFetching } = trpc.bookings.list.useQuery(
    {
      siteId,
      ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }
  );

  const sorted = useMemo(() =>
    [...(bookings ?? [])].sort(
      (a, b) => new Date(b.readyByTime).getTime() - new Date(a.readyByTime).getTime()
    ),
  [bookings]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Reg number, customer name…"
            className="h-9 w-full rounded-lg border border-[#D4D1CA] bg-white pl-9 pr-8 text-sm text-[#1C1A16] outline-none focus:border-[#E8650A] focus:ring-2 focus:ring-[#E8650A]/20"
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setDebouncedSearch(""); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isFetching && !isLoading && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-slate-300" />
          )}
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "h-7 px-2.5 rounded-full text-xs font-medium transition",
                statusFilter === s
                  ? "bg-[#1C1A16] text-white"
                  : "border border-[#D4D1CA] bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 justify-center text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading jobs…
        </div>
      ) : sorted.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-[#E8E6E0] py-14 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-400">No jobs found</p>
          {(debouncedSearch || statusFilter !== "ALL") && (
            <p className="text-xs text-slate-400 mt-1">Try clearing the search or filter</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E8E6E0]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E8E6E0] bg-[#F8F6F2]">
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Reg</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Service</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Dept</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Ready By</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned To</th>
                <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE8]">
              {sorted.map((job) => (
                <tr
                  key={job.id}
                  className={cn(
                    "transition hover:bg-[#F8F6F2]",
                    job.status === "CANCELLED" ? "opacity-50" : ""
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {job.isPriority && (
                        <Star className="h-3 w-3 fill-[#E8650A] text-[#E8650A] shrink-0" />
                      )}
                      <span className="font-bold tracking-wider text-[#1C1A16]">{job.vehicleReg}</span>
                    </div>
                    {(job.vehicleMake ?? job.vehicleModel) && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {[job.vehicleMake, job.vehicleModel].filter(Boolean).join(" ")}
                        {job.vehicleColour ? ` · ${job.vehicleColour}` : ""}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#1C1A16]">{job.customerName}</td>
                  <td className="px-4 py-3 text-slate-600">{job.serviceType.name}</td>
                  <td className="px-4 py-3 text-slate-500">{job.department?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(job.readyByTime)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {job.assignedTo
                      ? `${job.assignedTo.firstName} ${job.assignedTo.lastName}`
                      : <span className="text-slate-300">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <JobStatusBadge status={job.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-slate-400 border-t border-[#F0EDE8]">
            {sorted.length} job{sorted.length !== 1 ? "s" : ""}
            {debouncedSearch && ` matching "${debouncedSearch}"`}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab bar (shared UI) ──────────────────────────────────────────────────────

export type SiteTab = "live" | "calendar" | "jobs";

export function SiteTabBar({
  active,
  onChange,
}: {
  active: SiteTab;
  onChange: (t: SiteTab) => void;
}) {
  const tabs: { id: SiteTab; label: string; icon: React.ElementType }[] = [
    { id: "live",     label: "Live Board", icon: ClipboardList },
    { id: "calendar", label: "Calendar",   icon: Calendar },
    { id: "jobs",     label: "All Jobs",   icon: Search },
  ];
  return (
    <div className="flex gap-1 border-b border-[#E8E6E0] mb-5">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition",
            active === id
              ? "border-orange-500 text-orange-500"
              : "border-transparent text-slate-500 hover:text-slate-900"
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}
