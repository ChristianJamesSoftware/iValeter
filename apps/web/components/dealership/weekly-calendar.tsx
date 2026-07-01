"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { cn, formatTime } from "@/lib/utils";

interface Job {
  id: string;
  vehicleReg: string;
  customerName: string;
  status: BookingStatus;
  isPriority: boolean;
  readyByTime: string;
  serviceType: { name: string };
  department: { name: string } | null;
  assignedTo: { firstName: string; lastName: string } | null;
}

const DEPT_FILTERS = [
  "All",
  "New Car Sales",
  "Used Car Sales",
  "Service",
] as const;

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// Lower number = higher priority (float to top)
const STATUS_ORDER: Record<BookingStatus, number> = {
  IN_PROGRESS: 0,
  ASSIGNED:    1,
  QC_CHECK:    2,
  PENDING:     3,
  COMPLETED:   4,
  CANCELLED:   5,
};

const STATUS_DOT: Record<BookingStatus, string> = {
  PENDING: "bg-slate-400",
  ASSIGNED: "bg-blue-400",
  IN_PROGRESS: "bg-orange-400",
  QC_CHECK: "bg-purple-400",
  COMPLETED: "bg-emerald-400",
  CANCELLED: "bg-red-400",
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  PENDING: "Pending",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  QC_CHECK: "QC",
  COMPLETED: "Done",
  CANCELLED: "Cancelled",
};

function initials(first: string, last: string) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Monday of the week at the given offset from today (0 = current week). */
function mondayForOffset(weekOffset: number) {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  const day = base.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diff + weekOffset * 7);
  return monday;
}

function formatRange(monday: Date, sunday: Date) {
  const dayMonth = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${dayMonth(monday)} – ${dayMonth(sunday)} ${sunday.getFullYear()}`;
}

export function WeeklyCalendar({
  initialJobs,
  initialWeekOffset,
}: {
  initialJobs: Job[];
  initialWeekOffset: number;
}) {
  const router = useRouter();
  const [weekOffset, setWeekOffset] = useState(initialWeekOffset);
  const [deptFilter, setDeptFilter] =
    useState<(typeof DEPT_FILTERS)[number]>("All");

  const { monday, sunday, days, dateFrom, dateTo, todayIndex } = useMemo(() => {
    const mon = mondayForOffset(weekOffset);
    const ds = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mon);
      d.setDate(mon.getDate() + i);
      return d;
    });
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    const from = new Date(mon);
    const to = new Date(sun);
    to.setHours(23, 59, 59, 999);
    const now = new Date();
    const ti = ds.findIndex((d) => sameDay(d, now));
    return {
      monday: mon,
      sunday: sun,
      days: ds,
      dateFrom: from,
      dateTo: to,
      todayIndex: ti,
    };
  }, [weekOffset]);

  // Mobile single-day view: default to today's column when visible.
  const [selectedDay, setSelectedDay] = useState(
    todayIndex >= 0 ? todayIndex : 0,
  );

  const query = trpc.bookings.list.useQuery({ dateFrom, dateTo });

  const jobs: Job[] = useMemo(() => {
    if (query.data) {
      return query.data.map((b) => ({
        id: b.id,
        vehicleReg: b.vehicleReg,
        customerName: b.customerName,
        status: b.status,
        isPriority: b.isPriority,
        readyByTime: new Date(b.readyByTime).toISOString(),
        serviceType: { name: b.serviceType.name },
        department: b.department ? { name: b.department.name } : null,
        assignedTo: b.assignedTo
          ? {
              firstName: b.assignedTo.firstName,
              lastName: b.assignedTo.lastName,
            }
          : null,
      }));
    }
    return weekOffset === initialWeekOffset ? initialJobs : [];
  }, [query.data, weekOffset, initialWeekOffset, initialJobs]);

  // Group filtered jobs into one bucket per weekday, sorted by readyByTime asc.
  const weekDays = useMemo(() => {
    const filtered =
      deptFilter === "All"
        ? jobs
        : jobs.filter((j) => j.department?.name === deptFilter);
    return days.map((date, index) => {
      const dayJobs = filtered
        .filter((j) => sameDay(new Date(j.readyByTime), date))
        .sort((a, b) => {
          // 1. Active jobs first by status priority
          const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
          if (statusDiff !== 0) return statusDiff;
          // 2. Priority flag within same status group
          if (a.isPriority !== b.isPriority) return a.isPriority ? -1 : 1;
          // 3. Ready-by time within same group
          return new Date(a.readyByTime).getTime() - new Date(b.readyByTime).getTime();
        });
      return { date, index, jobs: dayJobs, isToday: index === todayIndex };
    });
  }, [jobs, days, deptFilter, todayIndex]);

  const selected = weekDays[selectedDay] ?? weekDays[0];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Week of {formatRange(monday, sunday)}
          </h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              aria-label="Previous week"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Next week"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {DEPT_FILTERS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDeptFilter(d)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                deptFilter === d
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {d}
            </button>
          ))}
          <Link
            href="/dealership/bookings/new"
            className="flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-orange-600"
          >
            <Plus className="h-3.5 w-3.5" />
            New Booking
          </Link>
        </div>
      </div>

      {/* Mobile day selector */}
      <div className="mb-4 flex gap-1 overflow-x-auto md:hidden">
        {weekDays.map((wd) => (
          <button
            key={wd.index}
            type="button"
            onClick={() => setSelectedDay(wd.index)}
            className={cn(
              "flex min-w-[3.25rem] flex-col items-center rounded-xl px-2 py-2 transition",
              selectedDay === wd.index
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
              {DAY_LABELS[wd.index]}
            </span>
            <span className="text-lg font-black">{wd.date.getDate()}</span>
            <span className="text-[10px]">{wd.jobs.length}</span>
          </button>
        ))}
      </div>

      {/* Mobile single-day column */}
      {selected && (
        <div className="md:hidden">
          <DayColumn
            date={selected.date}
            dayIndex={selected.index}
            jobs={selected.jobs}
            isToday={selected.isToday}
            onOpen={(id) => router.push(`/dealership/bookings/${id}`)}
          />
        </div>
      )}

      {/* Desktop 7-column grid */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-100 bg-white md:grid md:grid-cols-7">
        {weekDays.map((wd) => (
          <div
            key={wd.index}
            className={cn(
              "border-r border-slate-100 last:border-0",
              wd.isToday && "bg-orange-50/30",
            )}
          >
            {/* Column header */}
            <div
              className={cn(
                "px-2 pb-2 pt-3 text-center",
                wd.isToday && "border-b-2 border-orange-500",
              )}
            >
              <p
                className={cn(
                  "text-xs font-bold uppercase tracking-wider",
                  wd.index >= 5 ? "text-slate-300" : "text-slate-400",
                )}
              >
                {DAY_LABELS[wd.index]}
              </p>
              <p
                className={cn(
                  "text-2xl font-black",
                  wd.isToday ? "text-orange-500" : "text-slate-900",
                )}
              >
                {wd.date.getDate()}
              </p>
              <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 text-xs text-slate-500">
                {wd.jobs.length} {wd.jobs.length === 1 ? "job" : "jobs"}
              </span>
            </div>

            {/* Column body */}
            <div className="min-h-[600px] space-y-2 px-2 py-3">
              {wd.jobs.length === 0 ? (
                <div className="my-3 flex min-h-[80px] items-center justify-center rounded-xl border border-dashed border-slate-200">
                  <span className="text-xs text-slate-300">No jobs</span>
                </div>
              ) : (
                wd.jobs.map((j) => (
                  <BookingCard
                    key={j.id}
                    job={j}
                    onOpen={(id) => router.push(`/dealership/bookings/${id}`)}
                  />
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayColumn({
  date,
  dayIndex,
  jobs,
  isToday,
  onOpen,
}: {
  date: Date;
  dayIndex: number;
  jobs: Job[];
  isToday: boolean;
  onOpen: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-100 bg-white p-3",
        isToday && "bg-orange-50/30",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-black text-slate-900">
          {date.toLocaleDateString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "short",
          })}
        </p>
        <span className="rounded-full bg-slate-100 px-2 text-xs text-slate-500">
          {jobs.length} {jobs.length === 1 ? "job" : "jobs"}
        </span>
      </div>
      <div className="space-y-2">
        {jobs.length === 0 ? (
          <div className="flex min-h-[80px] items-center justify-center rounded-xl border border-dashed border-slate-200">
            <span className="text-xs text-slate-300">No jobs</span>
          </div>
        ) : (
          jobs.map((j) => (
            <BookingCard key={`${dayIndex}-${j.id}`} job={j} onOpen={onOpen} />
          ))
        )}
      </div>
    </div>
  );
}

function BookingCard({
  job,
  onOpen,
}: {
  job: Job;
  onOpen: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(job.id)}
      className={cn(
        "w-full rounded-xl border border-slate-100 bg-white p-3 text-left shadow-sm transition-all hover:border-slate-200 hover:shadow-md",
        job.isPriority && "border-l-[3px] border-l-orange-500",
        (job.status === "COMPLETED" || job.status === "CANCELLED") && "opacity-40",
      )}
    >
      <p className="font-mono text-sm font-black tracking-widest text-slate-900">
        {job.vehicleReg}
      </p>
      <p className="truncate text-xs text-slate-400">{job.customerName}</p>
      <p className="truncate text-xs text-slate-500">{job.serviceType.name}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] font-medium text-slate-500">
          Ready {formatTime(job.readyByTime)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 text-[10px] text-slate-500">
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                STATUS_DOT[job.status],
              )}
            />
            {STATUS_LABEL[job.status]}
          </span>
          {job.assignedTo && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[9px] font-bold text-white">
              {initials(job.assignedTo.firstName, job.assignedTo.lastName)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
