"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { BarChart2, Clock, CheckCircle, AlertTriangle, Download } from "lucide-react";

interface SiteOpt {
  id: string;
  name: string;
}

const DAILY_CAP_MINS = 480;

const PERIODS = [
  { label: "Today", days: 0 },
  { label: "This Week", days: 7 },
  { label: "This Month", days: 30 },
  { label: "Last 90 Days", days: 90 },
] as const;

function minsToHours(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getDateRange(days: number): { from: Date; to: Date } {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  if (days === 0) {
    from.setHours(0, 0, 0, 0);
  } else {
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

function exportCsv(rows: { id: string; vehicleReg: string; customerName: string; serviceType: string; department: string; site: string; status: string; durationMins: number; readyByTime: Date | string }[]) {
  const header = "ID,Vehicle Reg,Customer,Service Type,Department,Site,Status,Duration (mins),Ready By\n";
  const body = rows
    .map((r) =>
      [
        r.id,
        r.vehicleReg,
        `"${r.customerName}"`,
        `"${r.serviceType}"`,
        `"${r.department}"`,
        `"${r.site}"`,
        r.status,
        r.durationMins,
        new Date(r.readyByTime).toLocaleString("en-GB"),
      ].join(","),
    )
    .join("\n");
  const blob = new Blob([header + body], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ivaleter-report-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsDashboard({
  sites,
  defaultSiteId,
}: {
  sites: SiteOpt[];
  defaultSiteId: string;
}) {
  const [siteId, setSiteId] = useState(defaultSiteId);
  const [periodIdx, setPeriodIdx] = useState(1); // "This Week" default
  const period = PERIODS[periodIdx] ?? PERIODS[1]!;
  const { from, to } = getDateRange(period.days);

  const { data, isLoading } = trpc.reports.summary.useQuery(
    { siteId: siteId || undefined, dateFrom: from, dateTo: to },
  );

  const siteName = sites.find((s) => s.id === siteId)?.name ?? "All Sites";

  // Allocation flag: total mins vs days * daily cap
  const days = period.days === 0 ? 1 : period.days;
  const dailyCap = days * DAILY_CAP_MINS;
  const overAllocated = data ? data.totalValetMins > dailyCap : false;
  const allocationPct = data ? Math.round((data.totalValetMins / dailyCap) * 100) : 0;

  const inputCls =
    "h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {sites.length > 1 && (
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className={inputCls}
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setPeriodIdx(i)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                i === periodIdx
                  ? "bg-orange-500 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              } ${i > 0 ? "border-l border-slate-200" : ""}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {data && data.bookingsList.length > 0 && (
          <button
            onClick={() => exportCsv(data.bookingsList)}
            className="ml-auto flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        )}
      </div>

      {isLoading && (
        <div className="py-12 text-center text-sm text-slate-400">Loading report…</div>
      )}

      {!isLoading && data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              icon={<BarChart2 className="h-4 w-4 text-orange-500" />}
              label="Total Bookings"
              value={data.totalBookings}
            />
            <KpiCard
              icon={<CheckCircle className="h-4 w-4 text-emerald-600" />}
              label="Completed"
              value={data.completedBookings}
              sub={data.totalBookings > 0 ? `${Math.round((data.completedBookings / data.totalBookings) * 100)}%` : undefined}
            />
            <KpiCard
              icon={<Clock className="h-4 w-4 text-slate-500" />}
              label="Total Time"
              value={minsToHours(data.totalValetMins)}
            />
            <KpiCard
              icon={
                overAllocated ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                )
              }
              label="Allocation"
              value={`${allocationPct}%`}
              accent={overAllocated ? "red" : "green"}
            />
          </div>

          {/* Over-allocation warning */}
          {overAllocated && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              {siteName} is over the daily allocation limit for {period.label.toLowerCase()} — {minsToHours(data.totalValetMins)} booked vs {minsToHours(dailyCap)} available.
            </div>
          )}

          {/* Department breakdown */}
          {data.departments.length > 0 ? (
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-base font-bold text-slate-900">
                  Breakdown by Department
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">
                  {siteName} — {period.label}
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {data.departments.map((dept) => (
                  <DeptRow key={dept.deptId} dept={dept} dailyCap={dailyCap} days={days} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-500">No bookings for this period.</p>
              <p className="mt-1 text-xs text-slate-400">Try a different date range or site.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "red" | "green";
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p
        className={`mt-1 text-2xl font-black tracking-tight ${
          accent === "red"
            ? "text-red-600"
            : accent === "green"
            ? "text-emerald-600"
            : "text-slate-900"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function DeptRow({
  dept,
  dailyCap,
  days,
}: {
  dept: {
    deptId: string;
    deptName: string;
    count: number;
    totalMins: number;
    services: { name: string; count: number; totalMins: number }[];
  };
  dailyCap: number;
  days: number;
}) {
  const [open, setOpen] = useState(false);
  const pct = Math.min(100, Math.round((dept.totalMins / dailyCap) * 100));
  const over = dept.totalMins > dailyCap;

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/70 transition-colors"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-900">{dept.deptName}</span>
            <span className="ml-4 text-xs text-slate-400">
              {dept.count} booking{dept.count !== 1 ? "s" : ""} &bull; {minsToHours(dept.totalMins)}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-orange-400"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`mt-1 text-[10px] font-medium ${over ? "text-red-500" : "text-slate-400"}`}>
            {pct}% of {days}-day allocation
          </p>
        </div>
        <span className="text-xs text-slate-300">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-50 bg-slate-50/50 px-5 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="pb-2 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Service</th>
                <th className="pb-2 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Count</th>
                <th className="pb-2 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dept.services.map((s) => (
                <tr key={s.name}>
                  <td className="py-2 text-slate-700">{s.name}</td>
                  <td className="py-2 text-right text-slate-500">{s.count}</td>
                  <td className="py-2 text-right text-slate-500">{minsToHours(s.totalMins)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
