"use client";

// TODO Phase 4: replace with tRPC query (timesheets.list + clockEvents)
import { useState } from "react";
import { Users, MapPin, UserX, AlarmClock, Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/brand/stat-card";

type Status = "on_site" | "clocked_out" | "absent";

const ROWS: {
  name: string;
  status: Status;
  clockIn: string;
  clockOut: string;
  hours: string;
  site: string;
}[] = [
  { name: "James Mitchell", status: "on_site", clockIn: "07:58", clockOut: "—", hours: "5.2", site: "Glasgow" },
  { name: "Sarah Connor", status: "on_site", clockIn: "08:03", clockOut: "—", hours: "5.0", site: "Glasgow" },
  { name: "David Okafor", status: "clocked_out", clockIn: "07:45", clockOut: "16:10", hours: "8.4", site: "Leeds" },
  { name: "Priya Sharma", status: "absent", clockIn: "—", clockOut: "—", hours: "0.0", site: "Leeds" },
  { name: "Tom Baker", status: "on_site", clockIn: "08:31", clockOut: "—", hours: "4.5", site: "Glasgow" },
];

const STATUS_BADGE: Record<Status, { label: string; cls: string }> = {
  on_site: { label: "On Site", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  clocked_out: { label: "Clocked Out", cls: "bg-slate-100 text-slate-600 border-slate-200" },
  absent: { label: "Absent", cls: "bg-red-50 text-red-600 border-red-200" },
};

const th =
  "bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3 text-left";
const td = "border-b border-slate-50 text-sm text-slate-700 px-5 py-4";

export function AttendanceClient() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  const onSite = ROWS.filter((r) => r.status === "on_site").length;
  const absent = ROWS.filter((r) => r.status === "absent").length;
  const late = ROWS.filter((r) => r.clockIn > "08:30").length;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Attendance"
        subtitle="Clock-in activity across your team."
        action={
          <button className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
            <Download className="h-4 w-4" />
            Export timesheet
          </button>
        }
      />

      <div className="mb-6 flex items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
          />
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} title="Clocked In" value={ROWS.length - absent} accent="navy" />
        <StatCard icon={MapPin} title="On Site" value={onSite} accent="success" />
        <StatCard icon={UserX} title="Absent" value={absent} accent="danger" />
        <StatCard icon={AlarmClock} title="Late Arrivals" value={late} accent="warning" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Valeter</th>
              <th className={th}>Status</th>
              <th className={th}>Clock In</th>
              <th className={th}>Clock Out</th>
              <th className={th}>Hours</th>
              <th className={th}>Site</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => {
              const badge = STATUS_BADGE[r.status];
              return (
                <tr key={r.name} className="hover:bg-slate-50/50">
                  <td className={`${td} font-medium text-slate-900`}>{r.name}</td>
                  <td className={td}>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className={td}>{r.clockIn}</td>
                  <td className={td}>{r.clockOut}</td>
                  <td className={td}>{r.hours}</td>
                  <td className={td}>{r.site}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
