"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/react";
import type { RouterOutputs } from "@/lib/trpc/react";
import {
  Loader2,
  AlertTriangle,
  Download,
  FileText,
  CheckCircle2,
  Clock,
  Building2,
  BarChart2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ManagerReportData = RouterOutputs["reports"]["managerReport"];

interface Props {
  siteId: string;
  siteName: string;
}

type PeriodKey = "today" | "week" | "month";
type TabKey = "overview" | "forecast" | "department" | "valettype";

const PERIODS: { label: string; key: PeriodKey }[] = [
  { label: "Today", key: "today" },
  { label: "This Week", key: "week" },
  { label: "This Month", key: "month" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getPeriodDates(period: PeriodKey): { dateFrom: Date; dateTo: Date } {
  const now = new Date();
  const dateTo = new Date(now);
  dateTo.setHours(23, 59, 59, 999);

  const dateFrom = new Date(now);
  dateFrom.setHours(0, 0, 0, 0);

  if (period === "week") {
    // Monday of current week
    const day = dateFrom.getDay(); // 0=Sun
    const diff = day === 0 ? -6 : 1 - day;
    dateFrom.setDate(dateFrom.getDate() + diff);
  } else if (period === "month") {
    dateFrom.setDate(1);
  }

  return { dateFrom, dateTo };
}

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

function utilColour(pct: number): string {
  if (pct >= 100) return "bg-red-500";
  if (pct >= 75) return "bg-amber-400";
  return "bg-emerald-500";
}

function utilPill(pct: number, overAllocated: boolean): React.JSX.Element {
  if (overAllocated || pct >= 100) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        Over
      </span>
    );
  }
  if (pct >= 75) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        High
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
      OK
    </span>
  );
}

function minsToHhMm(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(data: ManagerReportData, siteName: string) {
  const header = `iValeter — Site Report\nSite: ${siteName}\nGenerated: ${new Date().toLocaleDateString("en-GB")}\n\n`;
  const cols = "Reg,Customer,Service,Department,Status,Duration (mins),Ready By\n";
  const rows = data.bookingsList
    .map((b) =>
      [
        b.vehicleReg,
        `"${b.customerName}"`,
        `"${b.serviceType}"`,
        `"${b.department}"`,
        b.status,
        b.durationMins,
        new Date(b.readyByTime).toLocaleDateString("en-GB"),
      ].join(","),
    )
    .join("\n");
  download(
    header + cols + rows,
    `ivaleter-report-${siteName.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv",
  );
}

// ---------------------------------------------------------------------------
// PDF export (print-based)
// ---------------------------------------------------------------------------

function exportPdf(data: ManagerReportData) {
  window.print();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate">{label}</span>
        <span className="text-slate opacity-50">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-navy">{value}</div>
    </div>
  );
}

function CapacityBar({ allocMins, capMins }: { allocMins: number; capMins: number }): React.JSX.Element {
  const pct = Math.min((allocMins / capMins) * 100, 100);
  const colour = utilColour(Math.round(pct));
  return (
    <div className="w-full overflow-hidden rounded-full bg-gray-100" style={{ height: "16px" }}>
      <div
        className={`h-full rounded-full transition-all ${colour}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Print-only report (hidden from screen, shows on print)
// ---------------------------------------------------------------------------

function PrintReport({ data }: { data: ManagerReportData }): React.JSX.Element {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print { body > * { display:none!important } #print-report { display:block!important } }`,
        }}
      />
      <div id="print-report" style={{ display: "none", padding: "32px", fontFamily: "sans-serif" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "4px" }}>iValeter</h1>
        <h2 style={{ fontSize: "18px", marginBottom: "2px" }}>{data.siteName}</h2>
        {data.siteAddress && (
          <p style={{ fontSize: "13px", color: "#666", marginBottom: "2px" }}>{data.siteAddress}</p>
        )}
        {data.dealershipName && (
          <p style={{ fontSize: "13px", color: "#666", marginBottom: "8px" }}>
            Dealership: {data.dealershipName}
          </p>
        )}
        <p style={{ fontSize: "13px", color: "#666", marginBottom: "24px" }}>
          Period: {new Date(data.dateFrom).toLocaleDateString("en-GB")} –{" "}
          {new Date(data.dateTo).toLocaleDateString("en-GB")} &nbsp;|&nbsp; Total Completed:{" "}
          {data.totalCompleted}
        </p>

        <h3 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "8px" }}>
          Completed Valets by Department
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ccc" }}>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Department</th>
              <th style={{ textAlign: "right", padding: "6px 8px" }}>Completed</th>
              <th style={{ textAlign: "right", padding: "6px 8px" }}>Total Mins</th>
            </tr>
          </thead>
          <tbody>
            {data.byDepartment.map((d) => (
              <tr key={d.deptName} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "6px 8px" }}>{d.deptName}</td>
                <td style={{ textAlign: "right", padding: "6px 8px" }}>{d.completed}</td>
                <td style={{ textAlign: "right", padding: "6px 8px" }}>{d.totalMins}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ fontSize: "15px", fontWeight: "bold", marginBottom: "8px" }}>
          7-Day Capacity Forecast
        </h3>
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px", fontSize: "13px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ccc" }}>
              <th style={{ textAlign: "left", padding: "6px 8px" }}>Date</th>
              <th style={{ textAlign: "right", padding: "6px 8px" }}>Booked (mins)</th>
              <th style={{ textAlign: "right", padding: "6px 8px" }}>Capacity (mins)</th>
              <th style={{ textAlign: "right", padding: "6px 8px" }}>Utilisation %</th>
              <th style={{ textAlign: "center", padding: "6px 8px" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.forecastDays.map((d) => (
              <tr key={d.date} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "6px 8px" }}>{fmtDate(d.date)}</td>
                <td style={{ textAlign: "right", padding: "6px 8px" }}>{d.allocMins}</td>
                <td style={{ textAlign: "right", padding: "6px 8px" }}>{d.capMins}</td>
                <td style={{ textAlign: "right", padding: "6px 8px" }}>{d.utilPct}%</td>
                <td style={{ textAlign: "center", padding: "6px 8px" }}>
                  {d.overAllocated ? "Over-allocated" : d.utilPct >= 75 ? "High" : "OK"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p style={{ fontSize: "11px", color: "#999", borderTop: "1px solid #eee", paddingTop: "12px" }}>
          Generated by iValeter · ivaleter.co.uk
        </p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ManagerReportsClient({ siteId, siteName }: Props): React.JSX.Element {
  const [period, setPeriod] = useState<PeriodKey>("week");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const { dateFrom, dateTo } = useMemo(() => getPeriodDates(period), [period]);

  const { data, isLoading, isError } = trpc.reports.managerReport.useQuery(
    { siteId, dateFrom, dateTo },
    { refetchOnWindowFocus: false },
  );

  // Derived KPIs
  const avgDuration = useMemo(() => {
    if (!data || data.totalCompleted === 0) return 0;
    const totalMins = data.byDepartment.reduce((s, d) => s + d.totalMins, 0);
    return Math.round(totalMins / data.totalCompleted);
  }, [data]);

  const activeDepts = data?.byDepartment.filter((d) => d.completed > 0).length ?? 0;
  const anyOverAllocated = data?.forecastDays.some((d) => d.overAllocated) ?? false;

  // -------------------------------------------------------------------------
  // Loading / error states
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="animate-spin text-cyan" size={32} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl border border-line bg-white p-8 text-center">
        <p className="text-slate">Unable to load manager report. Please try again.</p>
      </div>
    );
  }

  if (data.totalCompleted === 0 && data.bookingsList.length === 0) {
    return (
      <>
        <ToolbarRow
          period={period}
          onPeriodChange={setPeriod}
          onExportCsv={() => exportCsv(data, siteName)}
          onExportPdf={() => exportPdf(data)}
        />
        <div className="mt-6 rounded-xl border border-line bg-white p-8 text-center">
          <p className="text-slate">No data for the selected period.</p>
        </div>
        <PrintReport data={data} />
      </>
    );
  }

  // -------------------------------------------------------------------------
  // Full render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <ToolbarRow
        period={period}
        onPeriodChange={setPeriod}
        onExportCsv={() => exportCsv(data, siteName)}
        onExportPdf={() => exportPdf(data)}
      />

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-line bg-offwhite p-1">
        {(
          [
            { key: "overview" as TabKey, label: "Overview" },
            { key: "forecast" as TabKey, label: "Forecast" },
            { key: "department" as TabKey, label: "Departments" },
            { key: "valettype" as TabKey, label: "Valet Types" },
          ] as { key: TabKey; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-white text-navy shadow-sm"
                : "text-slate hover:text-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Overview tab                                                        */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              label="Valets Completed"
              value={data.totalCompleted}
              icon={<CheckCircle2 size={18} />}
            />
            <KpiCard
              label="Avg Duration"
              value={avgDuration > 0 ? `${avgDuration} min` : "—"}
              icon={<Clock size={18} />}
            />
            <KpiCard
              label="Departments Active"
              value={activeDepts}
              icon={<Building2 size={18} />}
            />
            <KpiCard
              label="Today's Utilisation"
              value={`${data.todayUtilPct}%`}
              icon={<BarChart2 size={18} />}
            />
          </div>

          {/* Today's capacity bar */}
          <div className="rounded-xl border border-line bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-navy">Today's Capacity</span>
              <span className="text-sm text-slate">
                {minsToHhMm(data.todayAllocMins)} / {minsToHhMm(data.todayCapMins)}
              </span>
            </div>
            <CapacityBar allocMins={data.todayAllocMins} capMins={data.todayCapMins} />
            <div className="mt-2 flex items-center justify-between text-xs text-slate">
              <span>0</span>
              <span className="font-medium">{data.todayUtilPct}% utilised</span>
              <span>480 min (8h)</span>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Forecast tab                                                        */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "forecast" && (
        <div className="space-y-4">
          {anyOverAllocated && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Over-allocation detected</p>
                <p className="mt-0.5 text-xs text-amber-700">
                  One or more days in the next 7 days exceed the 480-minute (8h) daily capacity. Review
                  and adjust bookings to avoid delays.
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-line bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate">
                    Date
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate">
                    Booked
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate">
                    Capacity
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate">
                    Util %
                  </th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.forecastDays.map((day, i) => (
                  <tr
                    key={day.date}
                    className={`border-b border-line last:border-0 ${i === 0 ? "bg-offwhite" : ""}`}
                  >
                    <td className="px-5 py-4 font-medium text-navy">
                      {fmtDate(day.date)}
                      {i === 0 && (
                        <span className="ml-2 text-xs font-normal text-slate">(today)</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-slate">{minsToHhMm(day.allocMins)}</td>
                    <td className="px-5 py-4 text-right text-slate">{minsToHhMm(day.capMins)}</td>
                    <td className="px-5 py-4 text-right font-medium text-navy">{day.utilPct}%</td>
                    <td className="px-5 py-4 text-center">
                      {utilPill(day.utilPct, day.overAllocated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Department tab                                                      */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "department" && (
        <div className="rounded-xl border border-line bg-white">
          {data.byDepartment.length === 0 ? (
            <div className="p-8 text-center text-slate">No department data for this period.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate">
                    Department
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate">
                    Completed
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate">
                    Total Mins
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate">
                    Avg Mins / Job
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.byDepartment.map((d) => (
                  <tr key={d.deptName} className="border-b border-line last:border-0">
                    <td className="px-5 py-4 font-medium text-navy">{d.deptName}</td>
                    <td className="px-5 py-4 text-right text-slate">{d.completed}</td>
                    <td className="px-5 py-4 text-right text-slate">{minsToHhMm(d.totalMins)}</td>
                    <td className="px-5 py-4 text-right font-medium text-navy">
                      {d.completed > 0 ? Math.round(d.totalMins / d.completed) : 0} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Valet Types tab                                                     */}
      {/* ------------------------------------------------------------------ */}
      {activeTab === "valettype" && (
        <div className="rounded-xl border border-line bg-white">
          {data.byServiceType.length === 0 ? (
            <div className="p-8 text-center text-slate">No completed valets for this period.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate">Valet Type</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate">Completed</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate">Avg Allocated</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate">Avg Actual</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate">Variance</th>
                </tr>
              </thead>
              <tbody>
                {data.byServiceType.map((s) => {
                  const variance = s.avgActualMins - s.avgAllocMins;
                  return (
                    <tr key={s.serviceTypeName} className="border-b border-line last:border-0">
                      <td className="px-5 py-4 font-medium text-navy">{s.serviceTypeName}</td>
                      <td className="px-5 py-4 text-right text-slate">{s.completed}</td>
                      <td className="px-5 py-4 text-right text-slate">{minsToHhMm(s.avgAllocMins)}</td>
                      <td className="px-5 py-4 text-right font-medium text-navy">{minsToHhMm(s.avgActualMins)}</td>
                      <td className="px-5 py-4 text-right">
                        {variance === 0 ? (
                          <span className="text-slate">—</span>
                        ) : (
                          <span className={variance > 0 ? "font-semibold text-amber-600" : "font-semibold text-emerald-600"}>
                            {variance > 0 ? "+" : ""}{variance}m
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Hidden print report */}
      <PrintReport data={data} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function ToolbarRow({
  period,
  onPeriodChange,
  onExportCsv,
  onExportPdf,
}: {
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Period pills */}
      <div className="flex gap-1 rounded-lg border border-line bg-offwhite p-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => onPeriodChange(p.key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              period === p.key
                ? "bg-white text-navy shadow-sm"
                : "text-slate hover:text-navy"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Export buttons */}
      <div className="flex gap-2">
        <button
          onClick={onExportCsv}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-slate hover:text-navy transition-colors"
        >
          <Download size={15} />
          CSV
        </button>
        <button
          onClick={onExportPdf}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-sm font-medium text-slate hover:text-navy transition-colors"
        >
          <FileText size={15} />
          PDF
        </button>
      </div>
    </div>
  );
}
