"use client";

// TODO: Add RecurringBooking model to schema in Phase 4
import { useState } from "react";
import { Plus, Pause, Play, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";

interface Recurring {
  id: string;
  site: string;
  department: string;
  serviceType: string;
  frequency: string;
  days: string;
  next: string;
  status: "Active" | "Paused";
}

const INITIAL: Recurring[] = [
  { id: "1", site: "Glasgow", department: "Showroom Prep", serviceType: "Full Valet", frequency: "Weekly", days: "Mon, Thu", next: "2026-06-25", status: "Active" },
  { id: "2", site: "Leeds", department: "Service Wash", serviceType: "Mini Valet", frequency: "Daily", days: "Mon–Fri", next: "2026-06-24", status: "Active" },
  { id: "3", site: "Glasgow", department: "PDI", serviceType: "Pre-Delivery", frequency: "Monthly", days: "1st", next: "2026-07-01", status: "Paused" },
];

const FREQ = ["Daily", "Weekly", "Monthly"];

const th =
  "bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3 text-left";
const td = "border-b border-slate-50 text-sm text-slate-700 px-5 py-4";
const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

export function RecurringBookingsClient() {
  const [rows, setRows] = useState<Recurring[]>(INITIAL);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    site: "",
    department: "",
    serviceType: "",
    frequency: "Weekly",
    days: "",
    next: "",
  });

  function add(e: React.FormEvent) {
    e.preventDefault();
    setRows((r) => [
      { id: crypto.randomUUID(), ...form, status: "Active" as const },
      ...r,
    ]);
    setForm({ site: "", department: "", serviceType: "", frequency: "Weekly", days: "", next: "" });
    setOpen(false);
  }

  function toggle(id: string) {
    setRows((r) =>
      r.map((x) =>
        x.id === id
          ? { ...x, status: x.status === "Active" ? "Paused" : "Active" }
          : x,
      ),
    );
  }

  function remove(id: string) {
    setRows((r) => r.filter((x) => x.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Recurring Bookings"
        subtitle="Schedule jobs that repeat automatically."
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

      {open && (
        <form
          onSubmit={add}
          className="mb-6 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3"
        >
          <input required placeholder="Site" value={form.site} onChange={(e) => setForm({ ...form, site: e.target.value })} className={inputCls} />
          <input required placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputCls} />
          <input required placeholder="Service type" value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} className={inputCls} />
          <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={inputCls}>
            {FREQ.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
          <input placeholder="Day(s) e.g. Mon, Thu" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} className={inputCls} />
          <input required type="date" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} className={inputCls} />
          <button type="submit" className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700">
            Create schedule
          </button>
        </form>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Site</th>
              <th className={th}>Department</th>
              <th className={th}>Service</th>
              <th className={th}>Frequency</th>
              <th className={th}>Day(s)</th>
              <th className={th}>Next</th>
              <th className={th}>Status</th>
              <th className={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50/50">
                <td className={`${td} font-medium text-slate-900`}>{r.site}</td>
                <td className={td}>{r.department}</td>
                <td className={td}>{r.serviceType}</td>
                <td className={td}>{r.frequency}</td>
                <td className={td}>{r.days}</td>
                <td className={td}>{r.next}</td>
                <td className={td}>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      r.status === "Active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className={td}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggle(r.id)}
                      aria-label={r.status === "Active" ? "Pause" : "Resume"}
                      className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      {r.status === "Active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      aria-label="Delete"
                      className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
