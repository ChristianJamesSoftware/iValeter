"use client";

/**
 * Recurring Bookings
 * Each recurring schedule has a "must be done by" time.
 * Status is GREEN if the last occurrence was completed on time,
 * RED if the deadline has passed today and it hasn't been completed,
 * AMBER if due today but not yet overdue.
 *
 * NOTE: Full DB persistence is Phase 4. State is local for now.
 */

import { useState, useMemo } from "react";
import { Plus, Pause, Play, Trash2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { cn } from "@/lib/utils";

interface Recurring {
  id: string;
  site: string;
  department: string;
  serviceType: string;
  frequency: string;
  days: string;
  mustDoneByTime: string;   // "HH:MM" — alert if overdue
  status: "Active" | "Paused";
  completedAt: string | null; // ISO string or null
}

const INITIAL: Recurring[] = [
  {
    id: "1", site: "Glasgow", department: "Showroom Prep", serviceType: "Showroom Clean",
    frequency: "Daily", days: "Mon–Fri", mustDoneByTime: "09:00",
    status: "Active", completedAt: null,
  },
  {
    id: "2", site: "Leeds", department: "Service Wash", serviceType: "Mini Valet",
    frequency: "Daily", days: "Mon–Fri", mustDoneByTime: "11:00",
    status: "Active", completedAt: new Date().toISOString(), // done today
  },
  {
    id: "3", site: "Glasgow", department: "PDI", serviceType: "Pre-Delivery",
    frequency: "Monthly", days: "1st", mustDoneByTime: "17:00",
    status: "Paused", completedAt: null,
  },
];

const FREQ = ["Daily", "Weekly", "Monthly"];

const TIME_SLOTS: string[] = (() => {
  const slots: string[] = [];
  for (let h = 7; h <= 18; h++) {
    for (const m of [0, 15, 30, 45]) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
})();

type BookingStatus = "complete" | "overdue" | "due-today" | "paused";

function getStatus(row: Recurring): BookingStatus {
  if (row.status === "Paused") return "paused";
  const now = new Date();

  // Check if completed today
  if (row.completedAt) {
    const cDate = new Date(row.completedAt);
    const isToday = cDate.toDateString() === now.toDateString();
    if (isToday) return "complete";
  }

  // Check if deadline has passed today
  const parts = row.mustDoneByTime.split(":");
  const h = Number(parts[0] ?? 0);
  const m = Number(parts[1] ?? 0);
  const deadline = new Date(now);
  deadline.setHours(h, m, 0, 0);

  if (now > deadline) return "overdue";

  // Due today but not yet overdue
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  if (now >= startOfDay) return "due-today";

  return "due-today";
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  "complete":  { label: "Done",    bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
  "overdue":   { label: "Overdue", bg: "bg-red-100",     text: "text-red-700",     icon: AlertTriangle },
  "due-today": { label: "Due",     bg: "bg-amber-100",   text: "text-amber-700",   icon: Clock },
  "paused":    { label: "Paused",  bg: "bg-slate-100",   text: "text-slate-500",   icon: Pause },
};

const inputCls = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

export function RecurringBookingsClient() {
  const [rows, setRows] = useState<Recurring[]>(INITIAL);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    site: "", department: "", serviceType: "",
    frequency: "Daily", days: "", mustDoneByTime: "09:00",
  });

  // Alert: count overdue active rows
  const overdueCount = useMemo(() => rows.filter((r) => getStatus(r) === "overdue").length, [rows]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setRows((r) => [
      { id: crypto.randomUUID(), ...form, status: "Active" as const, completedAt: null },
      ...r,
    ]);
    setForm({ site: "", department: "", serviceType: "", frequency: "Daily", days: "", mustDoneByTime: "09:00" });
    setOpen(false);
  }

  function toggle(id: string) {
    setRows((r) => r.map((x) => x.id === id ? { ...x, status: x.status === "Active" ? "Paused" as const : "Active" as const } : x));
  }

  function remove(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
  }

  function markDone(id: string) {
    setRows((r) => r.map((x) => x.id === id ? { ...x, completedAt: new Date().toISOString() } : x));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Recurring Bookings"
        subtitle="Scheduled jobs that repeat automatically — flagged if overdue."
        action={
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-lg bg-orange-500 px-4 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Add Recurring Booking
          </button>
        }
      />

      {/* Overdue alert banner */}
      {overdueCount > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-5 py-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm font-semibold text-red-900">
            {overdueCount} recurring job{overdueCount > 1 ? "s" : ""} past their deadline and not yet completed
          </p>
        </div>
      )}

      {/* Add form */}
      {open && (
        <form onSubmit={add} className="mb-5 rounded-xl border border-orange-200 bg-orange-50 p-5">
          <p className="mb-4 font-semibold text-slate-900">New Recurring Booking</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Site</label>
              <input value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} required placeholder="e.g. Glasgow" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Department</label>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} required placeholder="e.g. Showroom Prep" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Service Type</label>
              <input value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} required placeholder="e.g. Showroom Clean" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Frequency</label>
              <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={inputCls}>
                {FREQ.map((f) => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Days / Schedule</label>
              <input value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} required placeholder="e.g. Mon–Fri or 1st of month" className={inputCls} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Must Be Done By</label>
              <select value={form.mustDoneByTime} onChange={(e) => setForm({ ...form, mustDoneByTime: e.target.value })} className={inputCls}>
                {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Save</button>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-white">Cancel</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-line bg-offwhite text-xs uppercase text-slate">
            <tr>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Site</th>
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">Service</th>
              <th className="px-5 py-3">Frequency</th>
              <th className="px-5 py-3">Days</th>
              <th className="px-5 py-3">Done By</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const st = getStatus(row);
              const cfg = STATUS_CONFIG[st];
              const Icon = cfg.icon;
              return (
                <tr key={row.id} className={cn("border-b border-line last:border-0", st === "overdue" && "bg-red-50/30")}>
                  <td className="px-5 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", cfg.bg, cfg.text)}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-navy">{row.site}</td>
                  <td className="px-5 py-3 text-slate">{row.department}</td>
                  <td className="px-5 py-3 text-slate">{row.serviceType}</td>
                  <td className="px-5 py-3 text-slate">{row.frequency}</td>
                  <td className="px-5 py-3 text-slate">{row.days}</td>
                  <td className="px-5 py-3 font-semibold text-navy">{row.mustDoneByTime}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {(st === "due-today" || st === "overdue") && row.status === "Active" && (
                        <button
                          onClick={() => markDone(row.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Done
                        </button>
                      )}
                      <button onClick={() => toggle(row.id)} className="rounded-lg border border-line p-1.5 text-slate hover:border-navy hover:text-navy" title={row.status === "Active" ? "Pause" : "Resume"}>
                        {row.status === "Active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={() => remove(row.id)} className="rounded-lg border border-line p-1.5 text-slate hover:border-red-400 hover:text-red-500" title="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
