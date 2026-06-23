"use client";

// TODO Phase 4: replace mock data with tRPC analytics queries
import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  PoundSterling,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/brand/stat-card";

const BOOKINGS_BY_DAY = [
  { day: "Mon", count: 24 },
  { day: "Tue", count: 31 },
  { day: "Wed", count: 28 },
  { day: "Thu", count: 36 },
  { day: "Fri", count: 42 },
  { day: "Sat", count: 19 },
  { day: "Sun", count: 8 },
];

const BY_DEPARTMENT = [
  { name: "Valet Bay", total: 142, completed: 128, pending: 14, avg: "47m" },
  { name: "Showroom Prep", total: 86, completed: 80, pending: 6, avg: "1h 12m" },
  { name: "Service Wash", total: 64, completed: 61, pending: 3, avg: "22m" },
  { name: "PDI", total: 38, completed: 33, pending: 5, avg: "1h 40m" },
];

const TOP_PERFORMERS = [
  { name: "James Mitchell", jobs: 58, avg: "41m", rate: "98%" },
  { name: "Sarah Connor", jobs: 52, avg: "44m", rate: "96%" },
  { name: "David Okafor", jobs: 49, avg: "39m", rate: "99%" },
  { name: "Priya Sharma", jobs: 47, avg: "46m", rate: "94%" },
];

const th =
  "bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3 text-left";
const td = "border-b border-slate-50 text-sm text-slate-700 px-5 py-4";

export function ReportsClient() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const maxCount = Math.max(...BOOKINGS_BY_DAY.map((d) => d.count));
  const inputCls =
    "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Reports"
        subtitle="Performance and throughput across your sites."
      />

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Site
          </label>
          <select className={inputCls}>
            <option>All sites</option>
            <option>Arnold Clark · Glasgow</option>
            <option>Evans Halshaw · Leeds</option>
          </select>
        </div>
        <button className="ml-auto flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarDays} title="Total Bookings" value={168} accent="navy" />
        <StatCard icon={CheckCircle2} title="Completed" value={148} accent="success" />
        <StatCard icon={Clock} title="Avg Completion" value="48m" accent="cyan" />
        <StatCard icon={PoundSterling} title="Revenue" value="£14,820" accent="warning" />
      </div>

      {/* Bookings by day */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Bookings by day
        </h2>
        <div className="flex items-end justify-between gap-3" style={{ height: 180 }}>
          {BOOKINGS_BY_DAY.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-slate-900 transition-all"
                  style={{ height: `${(d.count / maxCount) * 100}%` }}
                  title={`${d.count} bookings`}
                />
              </div>
              <span className="text-xs font-medium text-slate-500">{d.day}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By department */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Bookings by department
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Department</th>
                <th className={th}>Total</th>
                <th className={th}>Done</th>
                <th className={th}>Pending</th>
                <th className={th}>Avg</th>
              </tr>
            </thead>
            <tbody>
              {BY_DEPARTMENT.map((d) => (
                <tr key={d.name} className="hover:bg-slate-50/50">
                  <td className={`${td} font-medium text-slate-900`}>{d.name}</td>
                  <td className={td}>{d.total}</td>
                  <td className={td}>{d.completed}</td>
                  <td className={td}>{d.pending}</td>
                  <td className={td}>{d.avg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top performers */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Top performers</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Valeter</th>
                <th className={th}>Jobs</th>
                <th className={th}>Avg</th>
                <th className={th}>Rate</th>
              </tr>
            </thead>
            <tbody>
              {TOP_PERFORMERS.map((p) => (
                <tr key={p.name} className="hover:bg-slate-50/50">
                  <td className={`${td} font-medium text-slate-900`}>{p.name}</td>
                  <td className={td}>{p.jobs}</td>
                  <td className={td}>{p.avg}</td>
                  <td className={td}>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                      {p.rate}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
