"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  CalendarDays,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

interface SiteOpt {
  id: string;
  name: string;
}

interface ManagerOpt {
  id: string;
  firstName: string;
  lastName: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getMondayBasedDays(year: number, month: number): (number | null)[] {
  // Returns array of 42 cells (6 rows × 7 cols), null = padding
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function ComplianceCalendar({
  sites,
  initialManagers,
}: {
  sites: SiteOpt[];
  initialManagers: ManagerOpt[];
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [completeId, setCompleteId] = useState<string | null>(null);

  // Form state
  const [formSiteId, setFormSiteId] = useState(sites[0]?.id ?? "");
  const [formManagerId, setFormManagerId] = useState(initialManagers[0]?.id ?? "");
  const [formNotes, setFormNotes] = useState("");

  // Complete form state
  const [completeScore, setCompleteScore] = useState("");
  const [completeNotes, setCompleteNotes] = useState("");

  const utils = trpc.useUtils();

  const { data: visits } = trpc.audits.list.useQuery({ year, month });
  const { data: managers } = trpc.audits.listAccountManagers.useQuery(undefined, {
    initialData: initialManagers as never,
  });
  const { data: upcoming } = trpc.audits.upcoming.useQuery({});

  const schedule = trpc.audits.schedule.useMutation({
    onSuccess: () => {
      void utils.audits.list.invalidate();
      void utils.audits.upcoming.invalidate();
      setShowForm(false);
      setSelectedDay(null);
      setFormNotes("");
    },
  });

  const complete = trpc.audits.complete.useMutation({
    onSuccess: () => {
      void utils.audits.list.invalidate();
      void utils.audits.upcoming.invalidate();
      setCompleteId(null);
      setCompleteScore("");
      setCompleteNotes("");
    },
  });

  const remove = trpc.audits.remove.useMutation({
    onSuccess: () => {
      void utils.audits.list.invalidate();
      void utils.audits.upcoming.invalidate();
    },
  });

  const cells = getMondayBasedDays(year, month);
  const todayStr = isoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());

  // Group visits by day number
  const visitsByDay = new Map<number, typeof visits>();
  for (const v of visits ?? []) {
    const d = new Date(v.visitDate).getDate();
    if (!visitsByDay.has(d)) visitsByDay.set(d, []);
    visitsByDay.get(d)!.push(v);
  }

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  const displayManagers = (managers as unknown as ManagerOpt[]) ?? initialManagers;

  return (
    <div className="space-y-6">
      {/* Upcoming visits strip */}
      {(upcoming ?? []).length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-700">
            Upcoming visits — next 30 days
          </p>
          <div className="flex flex-wrap gap-2">
            {(upcoming ?? []).map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs shadow-sm"
              >
                <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-semibold text-slate-800">{v.site.name}</span>
                <span className="text-slate-400">
                  {new Date(v.visitDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
                <span className="text-slate-500">
                  {v.accountManager.firstName} {v.accountManager.lastName}
                </span>
                {v.status === "DRAFT" && (
                  <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-700">
                    Scheduled
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={prevMonth}
              className="rounded-lg p-1.5 hover:bg-slate-100 transition"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5 text-slate-500" />
            </button>
            <h2 className="text-base font-bold text-slate-900">
              {MONTH_NAMES[month - 1]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="rounded-lg p-1.5 hover:bg-slate-100 transition"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </button>
          </div>
          <button
            onClick={() => { setShowForm(true); setCompleteId(null); }}
            className="flex h-9 items-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Schedule Visit
          </button>
        </div>

        {/* Schedule form */}
        {showForm && (
          <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-900">New site visit</p>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 hover:bg-slate-200">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Date</label>
                <input
                  type="date"
                  defaultValue={selectedDay ? isoDate(year, month, selectedDay) : ""}
                  id="visit-date"
                  min={todayStr}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Site</label>
                <select
                  value={formSiteId}
                  onChange={(e) => setFormSiteId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400"
                >
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Account Manager</label>
                <select
                  value={formManagerId}
                  onChange={(e) => setFormManagerId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400"
                >
                  {displayManagers.map((m) => (
                    <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Optional"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400"
                />
              </div>
            </div>
            {schedule.error && (
              <p className="mt-2 text-xs text-red-600">{schedule.error.message}</p>
            )}
            <button
              disabled={schedule.isPending || !formSiteId || !formManagerId}
              onClick={() => {
                const dateEl = document.getElementById("visit-date") as HTMLInputElement | null;
                const d = dateEl?.value;
                if (!d) return;
                schedule.mutate({
                  siteId: formSiteId,
                  accountManagerUserId: formManagerId,
                  visitDate: d,
                  notes: formNotes || undefined,
                });
              }}
              className="mt-3 h-9 rounded-lg bg-orange-500 px-5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              {schedule.isPending ? "Saving…" : "Schedule"}
            </button>
          </div>
        )}

        {/* Complete form */}
        {completeId && (
          <div className="border-b border-slate-100 bg-emerald-50 px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-900">Mark visit complete</p>
              <button onClick={() => setCompleteId(null)} className="rounded-lg p-1 hover:bg-emerald-100">
                <X className="h-4 w-4 text-slate-400" />
              </button>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Score (0–10)</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={completeScore}
                  onChange={(e) => setCompleteScore(e.target.value)}
                  placeholder="Optional"
                  className="h-10 w-32 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-400">Notes</label>
                <input
                  type="text"
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="Visit summary…"
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <button
                disabled={complete.isPending}
                onClick={() => complete.mutate({
                  id: completeId,
                  overallScore: completeScore ? Number(completeScore) : undefined,
                  notes: completeNotes || undefined,
                })}
                className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {complete.isPending ? "Saving…" : "Mark Complete"}
              </button>
            </div>
          </div>
        )}

        {/* Day-name headers */}
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {DAY_NAMES.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const dayVisits = day ? (visitsByDay.get(day) ?? []) : [];
            const isToday = day ? isoDate(year, month, day) === todayStr : false;
            const isPast = day ? isoDate(year, month, day) < todayStr : false;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (!day || isPast) return;
                  setSelectedDay(day);
                  setShowForm(true);
                  setCompleteId(null);
                }}
                className={cn(
                  "min-h-[90px] border-b border-r border-slate-50 p-1.5 text-xs transition",
                  day && !isPast ? "cursor-pointer hover:bg-orange-50/50" : "",
                  isToday ? "bg-orange-50" : "",
                  !day ? "bg-slate-50/40" : "",
                )}
              >
                {day && (
                  <>
                    <p className={cn(
                      "mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday ? "bg-orange-500 text-white" : "text-slate-600",
                    )}>
                      {day}
                    </p>
                    <div className="space-y-0.5">
                      {dayVisits.map((v) => (
                        <div
                          key={v.id}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            "group flex items-center justify-between gap-1 rounded px-1.5 py-1 text-[10px]",
                            v.status === "PUBLISHED"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-blue-50 text-blue-700",
                          )}
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            {v.status === "PUBLISHED"
                              ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                              : <Clock className="h-3 w-3 shrink-0" />
                            }
                            <span className="truncate font-semibold">{v.site.name}</span>
                          </div>
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                            {v.status === "DRAFT" && (
                              <button
                                onClick={() => { setCompleteId(v.id); setShowForm(false); }}
                                aria-label="Mark complete"
                                className="rounded p-0.5 hover:bg-emerald-100"
                                title="Mark complete"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                if (confirm("Remove this visit?")) remove.mutate({ id: v.id });
                              }}
                              aria-label="Remove visit"
                              className="rounded p-0.5 hover:bg-red-100 text-red-400"
                              title="Remove"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-blue-100" />
          Scheduled
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-emerald-100" />
          Completed
        </div>
        <div className="flex items-center gap-1.5">
          <MapPin className="h-3 w-3" />
          Click a future date to schedule
        </div>
        <div className="flex items-center gap-1.5">
          <User className="h-3 w-3" />
          Hover visit to complete or remove
        </div>
      </div>
    </div>
  );
}
