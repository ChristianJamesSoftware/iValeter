"use client";

import { useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/brand/stat-card";
import { trpc } from "@/lib/trpc/react";

const th =
  "bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-5 py-3 text-left";
const td = "border-b border-slate-50 text-sm text-slate-700 px-5 py-4";

function fmtMins(mins: number): string {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function ReportsClient() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [siteId, setSiteId] = useState("");

  const sites = trpc.sites.list.useQuery();
  const report = trpc.analytics.fullReport.useQuery({
    from: from || undefined,
    to: to || undefined,
    siteId: siteId || undefined,
  });

  const inputCls =
    "h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

  const data = report.data;

  function exportCsv() {
    if (!data) return;
    const rows: string[][] = [
      ["Section", "Name", "Count", "Avg Mins", "Target Mins"],
      ["Summary", "Total", String(data.total), "", ""],
      ["Summary", "Completed", String(data.completed), "", ""],
      ["Summary", "Cancelled", String(data.cancelled), "", ""],
      ["Summary", "Completion Rate %", String(data.completionRate), "", ""],
      ["Summary", "Overall Avg Mins", "", String(data.overallAvgMins), ""],
      ...data.byValetType.map((v) => [
        "Valet Type",
        v.name,
        String(v.count),
        String(v.avgMins),
        String(v.targetMins),
      ]),
      ...data.bySite.map((s) => [
        "Site",
        s.name,
        String(s.count),
        String(s.avgMins),
        "",
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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
        <button
          onClick={exportCsv}
          disabled={!data}
          className="ml-auto flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={CalendarDays}
          title="Total Bookings"
          value={data?.total ?? 0}
          accent="navy"
        />
        <StatCard
          icon={CheckCircle2}
          title="Completed"
          value={data?.completed ?? 0}
          accent="success"
        />
        <StatCard
          icon={Clock}
          title="Avg Completion"
          value={data ? fmtMins(data.overallAvgMins) : "—"}
          accent="cyan"
        />
        <StatCard
          icon={XCircle}
          title="Completion Rate"
          value={data ? `${data.completionRate}%` : "—"}
          accent="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By valet type */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Average time per valet type
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Valet type</th>
                <th className={th}>Completed</th>
                <th className={th}>Avg time</th>
                <th className={th}>Target</th>
              </tr>
            </thead>
            <tbody>
              {report.isLoading ? (
                <tr>
                  <td className={`${td} text-slate-400`} colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : (data?.byValetType.length ?? 0) === 0 ? (
                <tr>
                  <td className={`${td} text-slate-400`} colSpan={4}>
                    No completed jobs in range.
                  </td>
                </tr>
              ) : (
                data!.byValetType.map((v) => (
                  <tr key={v.name} className="hover:bg-slate-50/50">
                    <td className={`${td} font-medium text-slate-900`}>
                      {v.name}
                    </td>
                    <td className={td}>{v.count}</td>
                    <td className={td}>{fmtMins(v.avgMins)}</td>
                    <td className={td}>
                      <span
                        className={
                          v.avgMins > v.targetMins
                            ? "text-danger"
                            : "text-success"
                        }
                      >
                        {fmtMins(v.targetMins)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* By site */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Average time per site
            </h2>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Site</th>
                <th className={th}>Completed</th>
                <th className={th}>Avg time</th>
              </tr>
            </thead>
            <tbody>
              {report.isLoading ? (
                <tr>
                  <td className={`${td} text-slate-400`} colSpan={3}>
                    Loading…
                  </td>
                </tr>
              ) : (data?.bySite.length ?? 0) === 0 ? (
                <tr>
                  <td className={`${td} text-slate-400`} colSpan={3}>
                    No completed jobs in range.
                  </td>
                </tr>
              ) : (
                data!.bySite.map((s) => (
                  <tr key={s.name} className="hover:bg-slate-50/50">
                    <td className={`${td} font-medium text-slate-900`}>
                      {s.name}
                    </td>
                    <td className={td}>{s.count}</td>
                    <td className={td}>{fmtMins(s.avgMins)}</td>
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
