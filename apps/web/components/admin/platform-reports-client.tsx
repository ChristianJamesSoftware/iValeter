"use client";

import { useState, useMemo } from "react";
import {
  CheckCircle2,
  Users,
  Clock,
  AlertTriangle,
  Ban,
  Star,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Period helpers ──────────────────────────────────────────────────────────

type PeriodKey = "this_week" | "this_month" | "last_30" | "last_90";

function getDateRange(period: PeriodKey): { dateFrom: Date; dateTo: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "this_week": {
      const day = today.getDay(); // 0=Sun
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((day + 6) % 7));
      return { dateFrom: monday, dateTo: now };
    }
    case "this_month": {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: first, dateTo: now };
    }
    case "last_30": {
      const from = new Date(today);
      from.setDate(today.getDate() - 29);
      return { dateFrom: from, dateTo: now };
    }
    case "last_90": {
      const from = new Date(today);
      from.setDate(today.getDate() - 89);
      return { dateFrom: from, dateTo: now };
    }
  }
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "this_week", label: "This Week" },
  { key: "this_month", label: "This Month" },
  { key: "last_30", label: "Last 30 Days" },
  { key: "last_90", label: "Last 90 Days" },
];

// ─── Sort helpers ─────────────────────────────────────────────────────────────

type SortKey = "completed" | "totalMins" | "avgMins" | "overAllocDays";
type SortDir = "asc" | "desc";

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClass?: string;
}

function KpiCard({ label, value, icon, valueClass }: KpiCardProps): React.JSX.Element {
  return (
    <div className="rounded-xl border border-line bg-white p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate">{label}</span>
        <span className="text-slate">{icon}</span>
      </div>
      <span className={cn("text-3xl font-bold text-navy", valueClass)}>{value}</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlatformReportsClient(): React.JSX.Element {
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [sortKey, setSortKey] = useState<SortKey>("completed");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { dateFrom, dateTo } = useMemo(() => getDateRange(period), [period]);

  const { data, isLoading, isError } = trpc.reports.platformSummary.useQuery(
    { dateFrom, dateTo },
    { staleTime: 60_000 },
  );

  // ── Sort site table ──────────────────────────────────────────────────────
  const sortedSites = useMemo(() => {
    if (!data) return [];
    return [...data.sitePerformance].sort((a, b) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, sortKey, sortDir]);

  function handleSort(key: SortKey): void {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortIcon(key: SortKey): string {
    if (key !== sortKey) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  // ── Completion rate colour ───────────────────────────────────────────────
  function completionRateClass(rate: number): string {
    if (rate >= 85) return "text-green-600";
    if (rate >= 70) return "text-amber-500";
    return "text-red-500";
  }

  // ── Bar chart max ────────────────────────────────────────────────────────
  const maxDeptCount = useMemo(() => {
    if (!data || data.departmentBreakdown.length === 0) return 1;
    return Math.max(...data.departmentBreakdown.map((d) => d.completed));
  }, [data]);

  // ── Period comparison ────────────────────────────────────────────────────
  const pc = data?.periodComparison;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-slate">
        Failed to load platform data.
      </div>
    );
  }

  if (data.totalBookings === 0 && data.sitePerformance.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-slate">
        No data for the selected period.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={cn(
              "rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors",
              period === p.key
                ? "border-[#01696F] bg-[#01696F] text-white"
                : "border-line bg-white text-slate hover:text-navy",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Section A: Headline KPI strip ──────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Total Completed"
          value={data.totalCompleted}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <KpiCard
          label="Completion Rate"
          value={`${data.completionRate}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          valueClass={completionRateClass(data.completionRate)}
        />
        <KpiCard
          label="Active Valeters"
          value={data.activeValeters}
          icon={<Users className="h-5 w-5" />}
        />
        <KpiCard
          label="Avg Duration"
          value={`${data.avgCompletionMins}m`}
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          label="DNC Jobs"
          value={data.dncCount}
          icon={<Ban className="h-5 w-5" />}
        />
        <KpiCard
          label="Priority Jobs"
          value={data.priorityCount}
          icon={<Star className="h-5 w-5" />}
        />
      </div>

      {/* ── Section B: Site Performance table ──────────────────────────── */}
      <div className="rounded-xl border border-line bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="font-semibold text-navy">Site Performance</h2>
        </div>
        {sortedSites.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate text-sm">No site data available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-offwhite">
                  <th className="px-5 py-3 text-left font-semibold text-slate">Site</th>
                  <th
                    className="px-4 py-3 text-right font-semibold text-slate cursor-pointer hover:text-navy select-none"
                    onClick={() => handleSort("completed")}
                  >
                    Completed{sortIcon("completed")}
                  </th>
                  <th
                    className="px-4 py-3 text-right font-semibold text-slate cursor-pointer hover:text-navy select-none"
                    onClick={() => handleSort("totalMins")}
                  >
                    Total Hours{sortIcon("totalMins")}
                  </th>
                  <th
                    className="px-4 py-3 text-right font-semibold text-slate cursor-pointer hover:text-navy select-none"
                    onClick={() => handleSort("avgMins")}
                  >
                    Avg Duration{sortIcon("avgMins")}
                  </th>
                  <th
                    className="px-4 py-3 text-right font-semibold text-slate cursor-pointer hover:text-navy select-none"
                    onClick={() => handleSort("overAllocDays")}
                  >
                    Over-Alloc Days{sortIcon("overAllocDays")}
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedSites.map((site, idx) => (
                  <tr
                    key={site.siteId}
                    className={cn(
                      "border-b border-line last:border-0",
                      idx % 2 === 0 ? "bg-white" : "bg-offwhite/40",
                    )}
                  >
                    <td className="px-5 py-3 font-medium text-navy">{site.siteName}</td>
                    <td className="px-4 py-3 text-right text-navy">{site.completed}</td>
                    <td className="px-4 py-3 text-right text-slate">
                      {(site.totalMins / 60).toFixed(1)}h
                    </td>
                    <td className="px-4 py-3 text-right text-slate">{site.avgMins}m</td>
                    <td className="px-4 py-3 text-right text-slate">{site.overAllocDays}</td>
                    <td className="px-4 py-3 text-center">
                      {site.overAllocDays === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          On Track
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                          <AlertTriangle className="h-3 w-3" />
                          {site.overAllocDays} over-alloc
                          {site.overAllocDays === 1 ? " day" : " days"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Section C: Department Breakdown + Period Comparison ───────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Department breakdown — CSS-only horizontal bar chart */}
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-semibold text-navy">Department Breakdown</h2>
            <p className="text-xs text-slate mt-0.5">Completed jobs by department</p>
          </div>
          <div className="p-5 space-y-3">
            {data.departmentBreakdown.length === 0 ? (
              <p className="text-sm text-slate text-center py-4">No department data.</p>
            ) : (
              data.departmentBreakdown.map((dept) => {
                const barPct =
                  maxDeptCount > 0
                    ? Math.round((dept.completed / maxDeptCount) * 100)
                    : 0;
                return (
                  <div key={dept.deptId} className="flex items-center gap-3">
                    <span
                      className="w-28 shrink-0 truncate text-right text-xs font-medium text-slate"
                      title={dept.deptName}
                    >
                      {dept.deptName}
                    </span>
                    <div className="flex-1 h-5 rounded bg-offwhite overflow-hidden">
                      <div
                        className="h-full rounded bg-[#01696F] transition-all duration-300"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs font-semibold text-navy">
                      {dept.completed}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Period comparison */}
        <div className="rounded-xl border border-line bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-semibold text-navy">Period Comparison</h2>
            <p className="text-xs text-slate mt-0.5">This period vs the same-length period before</p>
          </div>
          <div className="p-5">
            {!pc ? (
              <p className="text-sm text-slate text-center py-4">No comparison data.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-end justify-between gap-4">
                  <div className="text-center flex-1">
                    <div className="text-4xl font-bold text-navy">{pc.current}</div>
                    <div className="text-xs text-slate mt-1 uppercase tracking-wide font-medium">
                      This Period
                    </div>
                  </div>
                  <div className="text-slate pb-4 text-2xl font-light">vs</div>
                  <div className="text-center flex-1">
                    <div className="text-4xl font-bold text-slate">{pc.previous}</div>
                    <div className="text-xs text-slate mt-1 uppercase tracking-wide font-medium">
                      Previous Period
                    </div>
                  </div>
                </div>

                <div
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg px-4 py-3",
                    pc.delta > 0
                      ? "bg-green-50 text-green-700"
                      : pc.delta < 0
                        ? "bg-red-50 text-red-600"
                        : "bg-offwhite text-slate",
                  )}
                >
                  {pc.delta > 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : pc.delta < 0 ? (
                    <TrendingDown className="h-5 w-5" />
                  ) : (
                    <Minus className="h-5 w-5" />
                  )}
                  <span className="font-semibold text-sm">
                    {pc.delta > 0 ? "+" : ""}
                    {pc.delta} completed
                    {pc.deltaPercent !== null
                      ? ` (${pc.delta > 0 ? "+" : ""}${pc.deltaPercent}%)`
                      : ""}
                  </span>
                </div>

                {data.avgQualityScore !== null && (
                  <div className="flex items-center justify-between rounded-lg border border-line px-4 py-3">
                    <span className="text-sm text-slate">Avg Quality Score</span>
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-navy">
                        {data.avgQualityScore} / 5
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
