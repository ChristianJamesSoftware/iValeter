"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Clock, TrendingUp, Loader2, FileDown } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { ValetTimingsClient } from "@/components/org/valet-timings-client";
import { InactiveUsersClient } from "@/components/org/inactive-users-client";

type ReportsTab = "summary" | "timings" | "inactive";

export function ReportsClient() {
  const [activeTab, setActiveTab] = useState<ReportsTab>("summary");

  return (
    <div className="space-y-0">
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b border-[#D4D1CA]">
        {(["summary", "timings", "inactive"] as ReportsTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === tab
                ? "border-[#01696F] text-[#01696F]"
                : "border-transparent text-[#7A7974] hover:text-[#28251D]",
            )}
          >
            {tab === "summary" ? "Summary" : tab === "timings" ? "Valet Timings" : "Inactive Users"}
          </button>
        ))}
      </div>

      {activeTab === "summary" && <ReportsSummaryClient />}
      {activeTab === "timings" && <ValetTimingsClient />}
      {activeTab === "inactive" && <InactiveUsersClient />}
    </div>
  );
}

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

function ReportsSummaryClient() {
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

  // Over-capacity alerting is handled by the Ops Centre page.
  // Removed from Reports to avoid illegal hook-in-loop crash.
  const overCapacitySites: string[] = [];

  function exportCsv() {
    if (!data) return;
    const rows = [
      ["Site", "Count", "Avg Mins"],
      ...(data.bySite ?? []).map((s: { name: string; count: number; avgMins: number }) => [
        s.name, String(s.count), "", "", String(s.avgMins),
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
                      <th className="px-5 py-2.5 text-right">Count</th>
                      <th className="px-5 py-2.5 text-right">Avg Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.bySite.map((row: { name: string; count: number; avgMins: number }) => (
                      <tr key={row.name} className="border-b border-line last:border-0">
                        <td className="px-5 py-3 font-medium text-navy">{row.name}</td>
                        <td className="px-5 py-3 text-right text-slate">{row.count}</td>
                        <td className="px-5 py-3 text-right text-slate">{row.avgMins ? `${row.avgMins}m` : "—"}</td>
                      </tr>
                    ))}
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
