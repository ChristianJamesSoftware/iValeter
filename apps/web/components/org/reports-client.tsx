"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, Loader2, FileDown } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type Period = "today" | "week" | "month";

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

function dateRangeForPeriod(period: Period): { from: Date; to: Date } {
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);

  if (period === "today") {
    from.setHours(0, 0, 0, 0);
  } else if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    from.setDate(now.getDate() + diff);
    from.setHours(0, 0, 0, 0);
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 999);
  } else {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    to.setMonth(from.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
  }
  return { from, to };
}

function fmtHours(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const DAILY_CAP_MINS = 480; // 8 hours

export function ReportsClient() {
  const [period, setPeriod] = useState<Period>("week");
  const [siteFilter, setSiteFilter] = useState<string>("all");

  const { from, to } = useMemo(() => dateRangeForPeriod(period), [period]);

  const sitesQuery = trpc.sites.list.useQuery();
  const reportQuery = trpc.analytics.fullReport.useQuery({
    from: from.toISOString(),
    to: to.toISOString(),
    siteId: siteFilter === "all" ? undefined : siteFilter,
  });

  const sites = sitesQuery.data ?? [];
  const data = reportQuery.data;

  // Per-site allocation check against today (for flagging over-capacity sites)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const allocationQueries = sites.map((site) =>
    trpc.bookings.getDayAllocation.useQuery(
      { siteId: site.id, date: todayStart, capacityMinsPerValeter: DAILY_CAP_MINS },
      { enabled: sites.length > 0 },
    )
  );

  const overCapacitySites = sites
    .filter((_, i) => allocationQueries[i]?.data?.isOverAllocated)
    .map((s) => s.name);

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Site", "Total", "Completed", "Cancelled", "Avg Mins"],
      ...(data.bySite ?? []).map((s: { site: string; total: number; completed: number; cancelled: number; avgMins: number }) => [
        s.site, String(s.total), String(s.completed), String(s.cancelled), String(s.avgMins),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `site-performance-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Site performance and capacity flags for your team" />

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition",
                period === p.key
                  ? "bg-navy text-white"
                  : "border border-line bg-white text-slate hover:border-navy hover:text-navy",
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {sites.length > 1 && (
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="h-9 rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          >
            <option value="all">All Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <button
          onClick={exportCsv}
          disabled={!data}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-slate transition hover:border-navy hover:text-navy disabled:opacity-40"
        >
          <FileDown className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Over-capacity alert */}
      {overCapacitySites.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-semibold text-amber-900">Over-capacity today — action may be needed</p>
            <p className="mt-1 text-sm text-amber-800">
              {overCapacitySites.join(", ")} {overCapacitySites.length === 1 ? "has" : "have"} valeters
              booked beyond 8 hours. Consider speaking to the customer about additional resource.
            </p>
          </div>
        </div>
      )}

      {reportQuery.isLoading && (
        <div className="flex items-center justify-center py-24 text-slate">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {data && (
        <div className="space-y-6">
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { icon: TrendingUp, label: "Total Bookings", value: data.total, color: "text-navy" },
              { icon: CheckCircle2, label: "Completed", value: data.completed, color: "text-emerald-600" },
              { icon: Clock, label: "Avg Duration", value: `${data.overallAvgMins ?? 0} mins`, color: "text-navy" },
              {
                icon: AlertTriangle,
                label: "Completion Rate",
                value: `${data.completionRate ?? 0}%`,
                color: (data.completionRate ?? 0) < 85 ? "text-amber-600" : "text-emerald-600",
              },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-line bg-white p-5">
                <kpi.icon className={cn("mb-2 h-5 w-5", kpi.color)} />
                <p className={cn("text-2xl font-bold", kpi.color)}>{kpi.value}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Per-site breakdown */}
          {data.bySite && data.bySite.length > 0 && (
            <div className="rounded-xl border border-line bg-white">
              <div className="border-b border-line px-5 py-3">
                <h2 className="font-semibold text-navy">Site Breakdown</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-offwhite text-xs uppercase text-slate">
                    <tr>
                      <th className="px-5 py-2.5 text-left">Site</th>
                      <th className="px-5 py-2.5 text-right">Total</th>
                      <th className="px-5 py-2.5 text-right">Completed</th>
                      <th className="px-5 py-2.5 text-right">Cancelled</th>
                      <th className="px-5 py-2.5 text-right">Avg Time</th>
                      <th className="px-5 py-2.5 text-center">Capacity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySite.map((row: { site: string; total: number; completed: number; cancelled: number; avgMins: number }, i: number) => {
                      const matchedSite = sites.find((s) => s.name === row.site);
                      const allocIdx = matchedSite ? sites.indexOf(matchedSite) : -1;
                      const allocData = allocIdx >= 0 ? allocationQueries[allocIdx]?.data : null;
                      const isOver = allocData?.isOverAllocated ?? false;
                      return (
                        <tr key={row.site} className={cn("border-b border-line last:border-0", isOver && "bg-amber-50/40")}>
                          <td className="px-5 py-3 font-medium text-navy">
                            <span className="flex items-center gap-2">
                              {row.site}
                              {isOver && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" title="Over capacity today" />}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-slate">{row.total}</td>
                          <td className="px-5 py-3 text-right text-emerald-600">{row.completed}</td>
                          <td className="px-5 py-3 text-right text-red-500">{row.cancelled}</td>
                          <td className="px-5 py-3 text-right text-slate">{row.avgMins ? `${row.avgMins}m` : "—"}</td>
                          <td className="px-5 py-3 text-center">
                            {allocData ? (
                              <span className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                                isOver
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800",
                              )}>
                                {isOver ? "Over capacity" : "Within capacity"}
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Valet type breakdown */}
          {data.byValetType && data.byValetType.length > 0 && (
            <div className="rounded-xl border border-line bg-white">
              <div className="border-b border-line px-5 py-3">
                <h2 className="font-semibold text-navy">By Service Type</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line bg-offwhite text-xs uppercase text-slate">
                    <tr>
                      <th className="px-5 py-2.5 text-left">Service</th>
                      <th className="px-5 py-2.5 text-right">Bookings</th>
                      <th className="px-5 py-2.5 text-right">Avg Time</th>
                      <th className="px-5 py-2.5 text-right">Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byValetType.map((v: { name: string; count: number; avgMins: number; targetMins: number }) => (
                      <tr key={v.name} className="border-b border-line last:border-0">
                        <td className="px-5 py-3 text-navy">{v.name}</td>
                        <td className="px-5 py-3 text-right text-slate">{v.count}</td>
                        <td className={cn(
                          "px-5 py-3 text-right font-medium",
                          v.targetMins && v.avgMins > v.targetMins ? "text-amber-600" : "text-navy",
                        )}>
                          {v.avgMins ? `${v.avgMins}m` : "—"}
                        </td>
                        <td className="px-5 py-3 text-right text-slate">
                          {v.targetMins ? `${v.targetMins}m` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
