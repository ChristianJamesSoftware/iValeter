"use client";

import React, { useState, useMemo } from "react";
import { Clock, TrendingUp, TrendingDown, Minus, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "week" | "month" | "quarter";
type SizeKey = "SMALL" | "MEDIUM" | "LARGE" | "XL" | "VAN" | "UNKNOWN";

const PERIOD_OPTIONS: { key: Period; label: string }[] = [
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
];

const SIZE_LABELS: Record<SizeKey, string> = {
  SMALL: "Small",
  MEDIUM: "Medium",
  LARGE: "Large",
  XL: "XL",
  VAN: "Van",
  UNKNOWN: "Unknown",
};

const SIZE_COLOURS: Record<SizeKey, string> = {
  SMALL: "#20808D",
  MEDIUM: "#1B474D",
  LARGE: "#A84B2F",
  XL: "#944454",
  VAN: "#6E522B",
  UNKNOWN: "#BAB9B4",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateRangeForPeriod(period: Period): { from: Date; to: Date } {
  const now = new Date();
  const to = new Date(now);
  to.setHours(23, 59, 59, 999);
  const from = new Date(now);

  if (period === "week") {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    from.setDate(now.getDate() + diff);
    from.setHours(0, 0, 0, 0);
  } else if (period === "month") {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
  } else {
    // quarter
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    from.setMonth(qStart, 1);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

function fmtMins(mins: number) {
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

interface DonutSlice {
  sizeKey: SizeKey;
  label: string;
  avgMins: number;
  count: number;
  colour: string;
}

function DonutChart({
  allocMins,
  avgActualMins,
  slices,
}: {
  allocMins: number;
  avgActualMins: number;
  slices: DonutSlice[];
}) {
  const SIZE = 140;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R_OUTER = 58;
  const R_INNER = 34;
  const GAP = 0.03; // radians gap between slices

  const total = slices.reduce((s, sl) => s + sl.count, 0);

  // Build arc paths from count proportions, coloured by size
  const paths: React.JSX.Element[] = [];
  if (total > 0) {
    let angle = -Math.PI / 2; // start at top
    slices
      .filter((sl) => sl.count > 0)
      .forEach((sl, i) => {
        const sweep = ((sl.count / total) * Math.PI * 2) - GAP;
        if (sweep <= 0) return;
        const x1 = CX + R_OUTER * Math.cos(angle + GAP / 2);
        const y1 = CY + R_OUTER * Math.sin(angle + GAP / 2);
        const x2 = CX + R_OUTER * Math.cos(angle + GAP / 2 + sweep);
        const y2 = CY + R_OUTER * Math.sin(angle + GAP / 2 + sweep);
        const ix1 = CX + R_INNER * Math.cos(angle + GAP / 2 + sweep);
        const iy1 = CY + R_INNER * Math.sin(angle + GAP / 2 + sweep);
        const ix2 = CX + R_INNER * Math.cos(angle + GAP / 2);
        const iy2 = CY + R_INNER * Math.sin(angle + GAP / 2);
        const large = sweep > Math.PI ? 1 : 0;
        const d = [
          `M ${x1} ${y1}`,
          `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${x2} ${y2}`,
          `L ${ix1} ${iy1}`,
          `A ${R_INNER} ${R_INNER} 0 ${large} 0 ${ix2} ${iy2}`,
          "Z",
        ].join(" ");
        paths.push(
          <path key={i} d={d} fill={sl.colour} opacity={0.9} />,
        );
        angle += sweep + GAP;
      });
  } else {
    // No data — draw a grey ring
    paths.push(
      <circle
        key="empty"
        cx={CX}
        cy={CY}
        r={(R_OUTER + R_INNER) / 2}
        fill="none"
        stroke="#D4D1CA"
        strokeWidth={R_OUTER - R_INNER}
      />,
    );
  }

  // Determine efficiency colour
  const diff = avgActualMins - allocMins;
  const effColour =
    avgActualMins === 0
      ? "#BAB9B4"
      : Math.abs(diff) <= 5
        ? "#437A22"
        : diff > 0
          ? "#A12C7B"
          : "#437A22";

  return (
    <div className="flex flex-col items-center">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {paths}
        {/* Centre text */}
        {avgActualMins > 0 ? (
          <>
            <text
              x={CX}
              y={CY - 6}
              textAnchor="middle"
              fontSize={13}
              fontWeight="700"
              fill={effColour}
              fontFamily="system-ui, sans-serif"
            >
              {fmtMins(avgActualMins)}
            </text>
            <text
              x={CX}
              y={CY + 10}
              textAnchor="middle"
              fontSize={8}
              fill="#7A7974"
              fontFamily="system-ui, sans-serif"
            >
              avg actual
            </text>
          </>
        ) : (
          <text
            x={CX}
            y={CY + 4}
            textAnchor="middle"
            fontSize={9}
            fill="#BAB9B4"
            fontFamily="system-ui, sans-serif"
          >
            No data
          </text>
        )}
      </svg>
    </div>
  );
}

// ─── Service Type Card ────────────────────────────────────────────────────────

interface ServiceTypeTiming {
  serviceTypeId: string;
  serviceTypeName: string;
  allocMins: number;
  avgActualMins: number;
  count: number;
  bySize: Record<SizeKey, { count: number; totalActualMins: number; avgActualMins: number }>;
}

function ServiceCard({ st }: { st: ServiceTypeTiming }) {
  const diff = st.avgActualMins - st.allocMins;
  const hasData = st.avgActualMins > 0;

  const slices: DonutSlice[] = (Object.keys(SIZE_LABELS) as SizeKey[])
    .filter((k) => k !== "UNKNOWN")
    .map((k) => ({
      sizeKey: k,
      label: SIZE_LABELS[k],
      avgMins: st.bySize[k]?.avgActualMins ?? 0,
      count: st.bySize[k]?.count ?? 0,
      colour: SIZE_COLOURS[k],
    }));

  const unknownCount = st.bySize.UNKNOWN?.count ?? 0;

  return (
    <div className="rounded-xl border border-[#D4D1CA] bg-white p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-[#28251D] text-sm">{st.serviceTypeName}</p>
          <p className="text-xs text-[#7A7974] mt-0.5">
            {st.count > 0 ? `${st.count} completed` : "No completions yet"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-[#7A7974]">Allocated</p>
          <p className="text-sm font-semibold text-[#28251D]">{fmtMins(st.allocMins)}</p>
        </div>
      </div>

      {/* Donut */}
      <DonutChart allocMins={st.allocMins} avgActualMins={st.avgActualMins} slices={slices} />

      {/* Efficiency badge */}
      {hasData && (
        <div
          className={cn(
            "flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
            Math.abs(diff) <= 5
              ? "bg-[#437A22]/10 text-[#437A22]"
              : diff > 0
                ? "bg-[#A12C7B]/10 text-[#A12C7B]"
                : "bg-[#437A22]/10 text-[#437A22]",
          )}
        >
          {Math.abs(diff) <= 5 ? (
            <Minus className="w-3 h-3" />
          ) : diff > 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {Math.abs(diff) <= 5
            ? "On target"
            : diff > 0
              ? `${fmtMins(diff)} over allocated`
              : `${fmtMins(Math.abs(diff))} under allocated`}
        </div>
      )}

      {/* Size breakdown */}
      {hasData && (
        <div className="space-y-1.5">
          {slices
            .filter((sl) => sl.count > 0)
            .map((sl) => (
              <div key={sl.sizeKey} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: sl.colour }}
                />
                <span className="text-xs text-[#7A7974] w-14 shrink-0">{sl.label}</span>
                <div className="flex-1 bg-[#F7F6F2] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (sl.avgMins / (st.allocMins * 2)) * 100)}%`,
                      backgroundColor: sl.colour,
                    }}
                  />
                </div>
                <span className="text-xs font-medium text-[#28251D] w-12 text-right">
                  {fmtMins(sl.avgMins)}
                </span>
                <span className="text-xs text-[#BAB9B4] w-8 text-right">×{sl.count}</span>
              </div>
            ))}
          {unknownCount > 0 && (
            <p className="text-[10px] text-[#BAB9B4] mt-1">
              {unknownCount} booking{unknownCount !== 1 ? "s" : ""} without vehicle size set
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ValetTimingsClient() {
  const [period, setPeriod] = useState<Period>("month");
  const [siteId, setSiteId] = useState<string>("all");

  const { from, to } = useMemo(() => dateRangeForPeriod(period), [period]);

  const sitesQuery = trpc.sites.list.useQuery();
  const timingsQuery = trpc.reports.valetTimings.useQuery({
    siteId: siteId === "all" ? undefined : siteId,
    dateFrom: from,
    dateTo: to,
  });

  const sites = sitesQuery.data ?? [];
  const serviceTypes = (timingsQuery.data?.serviceTypes ?? []) as ServiceTypeTiming[];
  const siteSummaries = timingsQuery.data?.sites ?? [];

  const loading = timingsQuery.isLoading;
  const noData = !loading && serviceTypes.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Valet Timings"
        subtitle="Average actual time per valet type vs allocated, broken down by vehicle size."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period */}
        <div className="flex rounded-lg border border-[#D4D1CA] overflow-hidden">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setPeriod(opt.key)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                period === opt.key
                  ? "bg-[#01696F] text-white"
                  : "bg-white text-[#7A7974] hover:bg-[#F7F6F2]",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Site */}
        {sites.length > 1 && (
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="rounded-lg border border-[#D4D1CA] bg-white px-3 py-1.5 text-sm text-[#28251D] focus:outline-none focus:ring-2 focus:ring-[#01696F]"
          >
            <option value="all">All Sites</option>
            {sites.map((s: { id: string; name: string }) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Site summary strip (HQ multi-site view) */}
      {siteSummaries.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {siteSummaries.map((s) => (
            <button
              key={s.siteId}
              onClick={() => setSiteId(s.siteId)}
              className={cn(
                "rounded-lg border p-3 text-left transition-all hover:shadow-sm",
                siteId === s.siteId
                  ? "border-[#01696F] bg-[#01696F]/5"
                  : "border-[#D4D1CA] bg-white",
              )}
            >
              <p className="text-xs font-medium text-[#28251D] truncate">{s.siteName}</p>
              <p className="text-lg font-bold text-[#01696F] mt-1">
                {fmtMins(s.avgActualMins)}
              </p>
              <p className="text-[10px] text-[#7A7974]">avg · {s.totalBookings} jobs</p>
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-[#7A7974]">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading timings…</span>
        </div>
      )}

      {/* No data */}
      {noData && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Clock className="w-10 h-10 text-[#D4D1CA] mb-3" />
          <p className="text-sm font-medium text-[#28251D]">No completed jobs in this period</p>
          <p className="text-xs text-[#7A7974] mt-1">
            Timings are calculated from completed bookings with clock-in and clock-out records.
          </p>
        </div>
      )}

      {/* Legend */}
      {!loading && serviceTypes.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {(Object.keys(SIZE_LABELS) as SizeKey[])
            .filter((k) => k !== "UNKNOWN")
            .map((k) => (
              <div key={k} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: SIZE_COLOURS[k] }}
                />
                <span className="text-xs text-[#7A7974]">{SIZE_LABELS[k]}</span>
              </div>
            ))}
          <div className="flex items-center gap-1.5 ml-auto">
            <AlertTriangle className="w-3 h-3 text-[#964219]" />
            <span className="text-xs text-[#7A7974]">Pink = over allocated time</span>
          </div>
        </div>
      )}

      {/* Cards grid */}
      {!loading && serviceTypes.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {serviceTypes.map((st) => (
            <ServiceCard key={st.serviceTypeId} st={st} />
          ))}
        </div>
      )}
    </div>
  );
}
