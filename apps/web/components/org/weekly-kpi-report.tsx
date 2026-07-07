"use client";

/**
 * WeeklyKpiReport
 * ────────────────
 * Mirrors the TOS weekly management report format.
 * Actuals from iValeter data where available (sales, valet days, sites, workforce).
 * Targets are editable inline and persisted to localStorage.
 * CSV export for Matt / TOS-Now import.
 */

import { useState, useMemo, useEffect } from "react";
import { Download, Pencil, Check, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Week definitions ─────────────────────────────────────────────────────────

interface WeekDef {
  wk: number;        // ISO week number
  label: string;     // "Wk 19"
  date: string;      // "11 May"
  startDate: Date;
  endDate: Date;
}

function isoWeekStart(year: number, week: number): Date {
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - day + 1 + (week - 1) * 7);
  return monday;
}

function buildWeeks(startWk: number, count: number, year: number): WeekDef[] {
  return Array.from({ length: count }, (_, i) => {
    const wk = startWk + i;
    const start = isoWeekStart(year, wk);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const label = `Wk ${wk}`;
    const date = start.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return { wk, label, date, startDate: start, endDate: end };
  });
}

// Wk19–Wk31 of 2026 (11 May → 3 Aug)
const WEEKS = buildWeeks(19, 13, 2026);

// ─── Metric definitions ───────────────────────────────────────────────────────

interface MetricDef {
  id: string;
  section: string;
  label: string;
  unit: "£" | "%" | "days" | "sites" | "people" | "shifts" | "valets" | "valet days" | "Negative feedback";
  format: (v: number) => string;
  higherIsBetter: boolean; // for variance colouring
}

function fmtGbp(v: number) { return `£${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`; }
function fmtPct(v: number) { return `${v.toFixed(1)}%`; }
function fmtNum(v: number) { return v.toLocaleString("en-GB", { maximumFractionDigits: 1 }); }

const METRICS: MetricDef[] = [
  { id: "totalSales",     section: "Sales",       label: "Total Sales Value",             unit: "£",                format: fmtGbp, higherIsBetter: true },
  { id: "costOfSales",    section: "Sales",       label: "Cost of Sales",                 unit: "£",                format: fmtGbp, higherIsBetter: false },
  { id: "grossProfit",    section: "Sales",       label: "Gross Profit",                  unit: "£",                format: fmtGbp, higherIsBetter: true },
  { id: "profitPct",      section: "Sales",       label: "Profit %",                      unit: "%",                format: fmtPct, higherIsBetter: true },
  { id: "valetDays",      section: "Valet Days",  label: "Total Valet Days Sold",         unit: "days",             format: fmtNum, higherIsBetter: true },
  { id: "avgDaysPerValeter", section: "Valet Days", label: "Avg Valet Days Worked Per Valeter", unit: "valet days", format: fmtNum, higherIsBetter: true },
  { id: "activeSites",    section: "Sites",       label: "Total Sites (Active)",          unit: "sites",            format: fmtNum, higherIsBetter: true },
  { id: "activeWorkforce", section: "Workforce",  label: "Active Workforce (field)",      unit: "people",           format: fmtNum, higherIsBetter: true },
  { id: "prospectiveWorkforce", section: "Workforce", label: "Prospective Workforce (field)", unit: "people",      format: fmtNum, higherIsBetter: true },
  { id: "staffingGaps",   section: "Service SLAs", label: "Staffing Gaps (unfilled shifts / no-shows)", unit: "shifts", format: fmtNum, higherIsBetter: false },
  { id: "reworkRate",     section: "Service SLAs", label: "Rework Rate (valets needing re-do)", unit: "valets",    format: fmtNum, higherIsBetter: false },
  { id: "focDays",        section: "Service SLAs", label: "FOC Days due to Guarantee",   unit: "days",             format: fmtNum, higherIsBetter: false },
  { id: "complaints",     section: "Service SLAs", label: "Customer Complaints / Negative Feedback", unit: "Negative feedback", format: fmtNum, higherIsBetter: false },
];

// ─── Seed actuals from the report ─────────────────────────────────────────────
// Wk19=index 0, Wk20=1 … Wk26=7, Wk27–31 = empty (live iValeter data)

type ActualMap = Record<string, Record<number, number | null>>;  // metricId → wkIndex → value

const SEED_ACTUALS: ActualMap = {
  totalSales:       { 0: 60713, 1: 62836, 2: 55260, 3: 62639, 4: 61757, 5: 62845, 6: 64564, 7: 62093 },
  costOfSales:      { 0: 39822, 1: 41976, 2: 35468, 3: 40972, 4: 41737, 5: 44479, 6: 41461, 7: 42436 },
  grossProfit:      { 0: 20891, 1: 20860, 2: 19792, 3: 21667, 4: 20021, 5: 18366, 6: 23103, 7: 19657 },
  profitPct:        { 0: 34.4, 1: 33.2, 2: 35.8, 3: 34.6, 4: 32.4, 5: 29.2, 6: 35.8, 7: 31.7 },
  valetDays:        { 0: 448, 1: 464.5, 2: 399, 3: 455, 4: 455.5, 5: 466.5, 6: 461, 7: 465 },
  avgDaysPerValeter:{ 7: 5.1 },
  activeSites:      { 0: 35, 1: 36, 2: 37, 3: 36, 4: 37, 5: 37, 6: 36, 7: 37 },
  activeWorkforce:  { 0: 89, 1: 91, 2: 92, 3: 90, 4: 92, 5: 97, 6: 92, 7: 92 },
  staffingGaps:     { 1: 0, 2: 0 },
  reworkRate:       { 1: 0, 2: 0 },
  focDays:          { 1: 0, 2: 0 },
};

// Seed targets from the report
type TargetMap = Record<string, Record<number, number | null>>; // metricId → wkIndex → target

const SEED_TARGETS: TargetMap = {
  totalSales:    { 1: 60657, 2: 61326, 3: 61996, 4: 62665, 5: 63335, 6: 64004, 7: 64674, 8: 65343, 9: 66013, 10: 66682, 11: 67352, 12: 68021 },
  valetDays:     { 1: 453, 2: 458, 3: 463, 4: 468, 5: 473, 6: 478, 7: 483, 8: 488, 9: 493, 10: 498, 11: 503, 12: 508 },
  activeSites:   { 1: 37, 2: 37, 3: 37, 4: 38, 5: 38, 6: 38, 7: 39, 8: 39, 9: 39, 10: 40, 11: 40, 12: 40 },
  activeWorkforce: { 1: 90, 2: 91, 3: 92, 4: 93, 5: 94, 6: 95, 7: 96, 8: 97, 9: 98, 10: 99, 11: 100, 12: 101 },
  prospectiveWorkforce: { 1: 22.5, 2: 22.8, 3: 23, 4: 23.3, 5: 23.5, 6: 23.8, 7: 24, 8: 24.3, 9: 24.5, 10: 24.8, 11: 25, 12: 25.3 },
};

const LS_KEY = "ivaleter_weekly_kpi_v1";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function varianceColor(actual: number, target: number, higherIsBetter: boolean) {
  const pct = (actual / target) * 100;
  if (higherIsBetter) {
    if (pct >= 100) return "text-emerald-600";
    if (pct >= 95) return "text-amber-600";
    return "text-red-600";
  } else {
    // lower is better (gaps, complaints etc.)
    if (actual === 0) return "text-emerald-600";
    if (actual <= target * 1.1) return "text-amber-600";
    return "text-red-600";
  }
}

function fmtVariance(actual: number, target: number, metric: MetricDef): string {
  const diff = actual - target;
  const pct = Math.round((actual / target) * 100);
  const sign = diff >= 0 ? "+" : "";
  if (metric.unit === "£") return `${sign}${fmtGbp(diff)} (${pct}%)`;
  if (metric.unit === "%") return `${sign}${diff.toFixed(1)}pp`;
  return `${sign}${fmtNum(diff)} (${pct}%)`;
}

// ─── Cell edit ────────────────────────────────────────────────────────────────

function EditableCell({
  value,
  onChange,
  format,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  format: (v: number) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [raw, setRaw] = useState("");

  if (editing) {
    return (
      <div className="flex items-center gap-0.5">
        <input
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const n = parseFloat(raw.replace(/[£,]/g, ""));
              onChange(isNaN(n) ? null : n);
              setEditing(false);
            }
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-24 rounded border border-[#01696F] bg-white px-1.5 py-0.5 text-xs text-[#28251D] outline-none"
        />
        <button onClick={() => { const n = parseFloat(raw.replace(/[£,]/g, "")); onChange(isNaN(n) ? null : n); setEditing(false); }} className="text-emerald-600 hover:text-emerald-700"><Check className="h-3 w-3" /></button>
        <button onClick={() => setEditing(false)} className="text-slate-400 hover:text-slate-600"><X className="h-3 w-3" /></button>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setRaw(value != null ? String(value) : ""); setEditing(true); }}
      className="group flex items-center gap-1 text-xs text-slate-600 hover:text-[#01696F] transition"
    >
      {value != null ? format(value) : <span className="text-slate-300">—</span>}
      <Pencil className="h-2.5 w-2.5 opacity-0 group-hover:opacity-60 transition" />
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WeeklyKpiReport() {
  // Load persisted overrides from localStorage
  const [actuals, setActuals] = useState<ActualMap>(() => {
    if (typeof window === "undefined") return SEED_ACTUALS;
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { actuals?: ActualMap; targets?: TargetMap };
        return { ...SEED_ACTUALS, ...(parsed.actuals ?? {}) };
      }
    } catch {}
    return SEED_ACTUALS;
  });

  const [targets, setTargets] = useState<TargetMap>(() => {
    if (typeof window === "undefined") return SEED_TARGETS;
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { actuals?: ActualMap; targets?: TargetMap };
        return { ...SEED_TARGETS, ...(parsed.targets ?? {}) };
      }
    } catch {}
    return SEED_TARGETS;
  });

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ actuals, targets }));
    } catch {}
  }, [actuals, targets]);

  function setActual(metricId: string, wkIdx: number, val: number | null) {
    setActuals((prev) => ({ ...prev, [metricId]: { ...(prev[metricId] ?? {}), [wkIdx]: val } }));
  }

  function setTarget(metricId: string, wkIdx: number, val: number | null) {
    setTargets((prev) => ({ ...prev, [metricId]: { ...(prev[metricId] ?? {}), [wkIdx]: val } }));
  }

  // ── CSV Export ──────────────────────────────────────────────────────────────

  function exportCsv() {
    const headers = ["Metric", "Section", "Unit", ...WEEKS.map((w) => `${w.label} ${w.date}`), ...WEEKS.map((w) => `${w.label} Target`)];
    const rows = METRICS.map((m) => {
      const actualVals = WEEKS.map((_, i) => actuals[m.id]?.[i] ?? "");
      const targetVals = WEEKS.map((_, i) => targets[m.id]?.[i] ?? "");
      return [m.label, m.section, m.unit, ...actualVals, ...targetVals];
    });

    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TOS-Weekly-KPI-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Group metrics by section ────────────────────────────────────────────────
  const sections = useMemo(() => {
    const map = new Map<string, MetricDef[]>();
    for (const m of METRICS) {
      if (!map.has(m.section)) map.set(m.section, []);
      map.get(m.section)!.push(m);
    }
    return map;
  }, []);

  // Current week index (which week are we in?)
  const now = new Date();
  const currentWkIdx = WEEKS.findIndex(
    (w) => now >= w.startDate && now <= w.endDate,
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#28251D]">Weekly Management KPIs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Wk19 (11 May) → Wk31 (3 Aug) 2026 · Click any value to edit · Targets editable inline
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 rounded-xl border border-[#D4D1CA] bg-white px-4 py-2 text-sm font-semibold text-[#28251D] shadow-sm transition hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto rounded-xl border border-[#D4D1CA] bg-white shadow-sm">
        <table className="min-w-[1400px] text-left text-xs">
          <thead>
            <tr className="border-b border-[#E8E6E0] bg-[#F7F6F2]">
              <th className="sticky left-0 z-10 min-w-[220px] bg-[#F7F6F2] px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Metric
              </th>
              {WEEKS.map((w, i) => (
                <th
                  key={w.wk}
                  className={cn(
                    "min-w-[90px] px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider",
                    i === currentWkIdx ? "bg-[#01696F]/10 text-[#01696F]" : "text-slate-500",
                  )}
                >
                  <p>{w.label}</p>
                  <p className="font-normal normal-case text-[10px] opacity-70">{w.date}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from(sections.entries()).map(([section, metrics]) => (
              <>
                {/* Section header row */}
                <tr key={`section-${section}`} className="border-b border-[#E8E6E0] bg-[#F7F6F2]/60">
                  <td
                    colSpan={1 + WEEKS.length}
                    className="sticky left-0 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#E8650A]"
                  >
                    {section}
                  </td>
                </tr>

                {metrics.map((metric) => {
                  return (
                    <>
                      {/* Actual row */}
                      <tr key={`${metric.id}-actual`} className="border-b border-[#F0EDE8] hover:bg-slate-50/50">
                        <td className="sticky left-0 z-10 bg-white px-4 py-2.5 font-medium text-[#28251D]">
                          {metric.label}
                          <span className="ml-1.5 text-[10px] font-normal text-slate-400">({metric.unit})</span>
                        </td>
                        {WEEKS.map((w, i) => {
                          const actual = actuals[metric.id]?.[i] ?? null;
                          return (
                            <td key={i} className={cn("px-3 py-2.5 text-center", i === currentWkIdx && "bg-[#01696F]/5")}>
                              <EditableCell
                                value={actual}
                                onChange={(v) => setActual(metric.id, i, v)}
                                format={metric.format}
                              />
                            </td>
                          );
                        })}
                      </tr>

                      {/* Variance row */}
                      <tr key={`${metric.id}-variance`} className="border-b border-[#F0EDE8]">
                        <td className="sticky left-0 z-10 bg-white px-4 py-1.5 text-[10px] text-slate-400">vs target</td>
                        {WEEKS.map((w, i) => {
                          const actual = actuals[metric.id]?.[i] ?? null;
                          const target = targets[metric.id]?.[i] ?? null;
                          if (actual == null || target == null) {
                            return <td key={i} className={cn("px-3 py-1.5 text-center text-[10px] text-slate-300", i === currentWkIdx && "bg-[#01696F]/5")}>—</td>;
                          }
                          const color = varianceColor(actual, target, metric.higherIsBetter);
                          const text = fmtVariance(actual, target, metric);
                          return (
                            <td key={i} className={cn("px-3 py-1.5 text-center", i === currentWkIdx && "bg-[#01696F]/5")}>
                              <span className={cn("text-[10px] font-semibold", color)}>{text}</span>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Target row */}
                      <tr key={`${metric.id}-target`} className="border-b-2 border-[#E8E6E0]">
                        <td className="sticky left-0 z-10 bg-white px-4 py-1.5 text-[10px] italic text-slate-400">target</td>
                        {WEEKS.map((w, i) => {
                          const target = targets[metric.id]?.[i] ?? null;
                          return (
                            <td key={i} className={cn("px-3 py-1.5 text-center", i === currentWkIdx && "bg-[#01696F]/5")}>
                              <EditableCell
                                value={target}
                                onChange={(v) => setTarget(metric.id, i, v)}
                                format={metric.format}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  );
                })}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> At or above target</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Within 5% of target</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Below target (&gt;5%)</span>
        <span className="ml-auto text-[10px] text-slate-300">Values auto-saved in browser · Export CSV for TOS-Now import</span>
      </div>
    </div>
  );
}
