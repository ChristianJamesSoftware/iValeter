"use client";

import { useState } from "react";
import { Users, Clock, PoundSterling, Download } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/brand/stat-card";
import { trpc } from "@/lib/trpc/react";

const DEPARTMENTS = [
  "New Car Sales",
  "Used Car Sales",
  "Service",
  "Admin",
  "Other",
];

const th =
  "bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3 text-left";
const td = "border-b border-slate-50 text-sm text-slate-700 px-5 py-4";

function mondayOf(d: Date): string {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day + 6) % 7; // days since Monday
  date.setDate(date.getDate() - diff);
  return date.toISOString().slice(0, 10);
}

function fmtDate(d: string | Date | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function AttendanceClient() {
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [siteId, setSiteId] = useState("");
  const [department, setDepartment] = useState("");

  const sites = trpc.sites.list.useQuery({});
  const timesheets = trpc.timesheets.list.useQuery({
    weekStart: weekStart || undefined,
    siteId: siteId || undefined,
    departmentId: department || undefined,
  });

  const rows = (timesheets.data ?? []).map((t) => {
    const regular = t.totalRegularHours ?? 0;
    const overtime = t.totalOvertimeHours ?? 0;
    const daysWorked = t.lines.length;
    const dailyRate = t.user.dailyRate ?? 0;
    const totalPay = dailyRate * daysWorked;
    return {
      id: t.id,
      name: `${t.user.firstName} ${t.user.lastName}`,
      payId: t.user.payId ?? "—",
      site: t.site?.name ?? t.user.site?.name ?? "—",
      department: "—",
      weekStart: t.weekStarting,
      regular,
      overtime,
      total: regular + overtime,
      dailyRate,
      totalPay,
    };
  });

  const totalHours = rows.reduce((acc, r) => acc + r.total, 0);
  const totalPayroll = rows.reduce((acc, r) => acc + r.totalPay, 0);

  const inputCls =
    "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

  function exportCsv() {
    const header = [
      "Name",
      "Pay ID",
      "Site",
      "Department",
      "Week Start",
      "Regular Hours",
      "Overtime Hours",
      "Total Hours",
      "Daily Rate",
      "Total Pay",
    ];
    const body = rows.map((r) => [
      r.name,
      r.payId,
      r.site,
      r.department,
      fmtDate(r.weekStart),
      r.regular.toFixed(2),
      r.overtime.toFixed(2),
      r.total.toFixed(2),
      r.dailyRate.toFixed(2),
      r.totalPay.toFixed(2),
    ]);
    const csv = [header, ...body]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${weekStart}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Attendance"
        subtitle="Weekly timesheets across your team."
        action={
          <button
            onClick={exportCsv}
            disabled={rows.length === 0}
            className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export timesheet
          </button>
        }
      />

      <div className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Week starting
          </label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Site
          </label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className={inputCls}
          >
            <option value="">All sites</option>
            {(sites.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
            Department
          </label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={inputCls}
          >
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={Users}
          title="Timesheets"
          value={rows.length}
          accent="navy"
        />
        <StatCard
          icon={Clock}
          title="Total Hours"
          value={totalHours.toFixed(1)}
          accent="cyan"
        />
        <StatCard
          icon={PoundSterling}
          title="Total Pay"
          value={`£${totalPayroll.toFixed(2)}`}
          accent="success"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr>
                <th className={th}>Name</th>
                <th className={th}>Pay ID</th>
                <th className={th}>Site</th>
                <th className={th}>Week Start</th>
                <th className={th}>Regular</th>
                <th className={th}>Overtime</th>
                <th className={th}>Total</th>
                <th className={th}>Daily Rate</th>
                <th className={th}>Total Pay</th>
              </tr>
            </thead>
            <tbody>
              {timesheets.isLoading ? (
                <tr>
                  <td className={`${td} text-slate-400`} colSpan={9}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className={`${td} text-slate-400`} colSpan={9}>
                    No timesheets for this week.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className={`${td} font-medium text-slate-900`}>
                      {r.name}
                    </td>
                    <td className={`${td} font-mono text-xs`}>{r.payId}</td>
                    <td className={td}>{r.site}</td>
                    <td className={td}>{fmtDate(r.weekStart)}</td>
                    <td className={td}>{r.regular.toFixed(2)}</td>
                    <td className={td}>{r.overtime.toFixed(2)}</td>
                    <td className={td}>{r.total.toFixed(2)}</td>
                    <td className={td}>£{r.dailyRate.toFixed(2)}</td>
                    <td className={td}>£{r.totalPay.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
