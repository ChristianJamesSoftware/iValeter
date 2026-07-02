"use client";

import { useState } from "react";
import { Loader2, Car } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

const SIZE_LABELS: Record<string, string> = {
  SMALL:  "Small",
  MEDIUM: "Medium",
  LARGE:  "Large",
  XL:     "XL",
  VAN:    "Van",
};

const SIZE_COLORS: Record<string, string> = {
  SMALL:  "bg-sky-100 text-sky-700",
  MEDIUM: "bg-violet-100 text-violet-700",
  LARGE:  "bg-[#01696F]/10 text-[#01696F]",
  XL:     "bg-amber-100 text-amber-700",
  VAN:    "bg-slate-100 text-slate-600",
};

export function VehicleSizeReport(): React.JSX.Element {
  const [days, setDays] = useState(30);

  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const dateTo = new Date();

  const { data, isLoading } = trpc.reports.vehicleSizeReport.useQuery({
    dateFrom,
    dateTo,
  });

  const totalJobs = data?.reduce((sum, r) => sum + r.count, 0) ?? 0;

  return (
    <div className="rounded-xl border border-[#D4D1CA] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-[#01696F]" />
          <h3 className="font-heading font-bold text-[#28251D]">Valet Time by Vehicle Size</h3>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="h-8 rounded-lg border border-[#D4D1CA] bg-white px-2 text-sm text-[#28251D] outline-none focus:border-[#01696F]"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      ) : !data || totalJobs === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          No completed bookings in this period.
        </p>
      ) : (
        <div className="space-y-3">
          {/* Bar chart */}
          {data.map((row) => {
            const pct = totalJobs > 0 ? Math.round((row.count / totalJobs) * 100) : 0;
            return (
              <div key={row.size} className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-16 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold",
                    SIZE_COLORS[row.size] ?? "bg-slate-100 text-slate-600",
                  )}
                >
                  {SIZE_LABELS[row.size] ?? row.size}
                </span>
                <div className="flex-1">
                  <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-[#01696F]/80 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center pl-3 text-xs font-semibold text-white mix-blend-difference">
                      {row.count} jobs ({pct}%)
                    </span>
                  </div>
                </div>
                <div className="w-40 shrink-0 text-right text-xs text-slate-500">
                  {row.avgAllocatedMins != null && (
                    <span>Alloc: <span className="font-semibold text-[#28251D]">{row.avgAllocatedMins}m</span></span>
                  )}
                  {row.avgActualMins != null && (
                    <span className="ml-2">
                      Actual:{" "}
                      <span
                        className={cn(
                          "font-semibold",
                          row.differenceMins != null && row.differenceMins > 5
                            ? "text-amber-600"
                            : "text-emerald-600",
                        )}
                      >
                        {row.avgActualMins}m
                      </span>
                    </span>
                  )}
                  {row.differenceMins != null && row.count > 0 && (
                    <span className={cn(
                      "ml-1 text-[10px] font-semibold",
                      row.differenceMins > 5 ? "text-amber-500" : "text-slate-400",
                    )}>
                      ({row.differenceMins > 0 ? "+" : ""}{row.differenceMins}m)
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-2 pr-4 text-left">Size</th>
                  <th className="pb-2 pr-4 text-right">Jobs</th>
                  <th className="pb-2 pr-4 text-right">Avg Allocated</th>
                  <th className="pb-2 pr-4 text-right">Avg Actual</th>
                  <th className="pb-2 text-right">Difference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data.map((row) => (
                  <tr key={row.size}>
                    <td className="py-2 pr-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                          SIZE_COLORS[row.size] ?? "bg-slate-100 text-slate-600",
                        )}
                      >
                        {SIZE_LABELS[row.size] ?? row.size}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-right font-semibold text-[#28251D]">
                      {row.count}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-600">
                      {row.avgAllocatedMins != null ? `${row.avgAllocatedMins} mins` : "—"}
                    </td>
                    <td className="py-2 pr-4 text-right text-slate-600">
                      {row.avgActualMins != null ? `${row.avgActualMins} mins` : "—"}
                    </td>
                    <td className="py-2 text-right">
                      {row.differenceMins != null && row.count > 0 ? (
                        <span
                          className={cn(
                            "font-semibold",
                            row.differenceMins > 5 ? "text-amber-600" : "text-emerald-600",
                          )}
                        >
                          {row.differenceMins > 0 ? "+" : ""}{row.differenceMins} mins
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Actual time = from booking created to completion. Difference shows over/under allocation.
          </p>
        </div>
      )}
    </div>
  );
}
