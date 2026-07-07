"use client";

import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

type Alert = {
  id: string;
  type: string;
  severity: "red" | "amber";
  message: string;
  siteId?: string | undefined;
  siteName?: string | undefined;
  createdAt: Date;
};

type SiteHealth = {
  siteId: string;
  siteName: string;
  totalValeters: number;
  clockedIn: number;
  bookingsToday: number;
  capacityPct: number;
  coverOk: boolean;
};

export function HqCommandCentre() {
  // Alerts — auto-refresh every 60s
  const { data: alerts } = trpc.hq.alerts.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const { data: siteHealth } = trpc.hq.siteHealth.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const displayAlerts = alerts ?? [];
  const displayHealth = siteHealth ?? [];

  return (
    <div className="space-y-6">
      {/* Live Alerts — compact summary only */}
      <section>
        <h2 className="mb-3 font-heading text-sm font-black uppercase tracking-wider text-slate-500">
          Live Alerts
        </h2>
        {displayAlerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-3.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-700">All clear — no active alerts</span>
          </div>
        ) : (
          <Link
            href="/admin/reports"
            className={cn(
              "flex items-center gap-3 rounded-2xl border px-5 py-3.5 transition hover:opacity-90",
              displayAlerts.some((a) => a.severity === "red")
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50",
            )}
          >
            <AlertTriangle
              className={cn(
                "h-4 w-4 shrink-0",
                displayAlerts.some((a) => a.severity === "red") ? "text-red-500" : "text-amber-500",
              )}
            />
            <div className="flex-1">
              <span
                className={cn(
                  "text-sm font-semibold",
                  displayAlerts.some((a) => a.severity === "red") ? "text-red-900" : "text-amber-900",
                )}
              >
                {displayAlerts.filter((a) => a.severity === "red").length > 0 && (
                  <span className="mr-2 rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                    {displayAlerts.filter((a) => a.severity === "red").length} critical
                  </span>
                )}
                {displayAlerts.filter((a) => a.severity === "amber").length > 0 && (
                  <span className="mr-2 rounded-full bg-amber-400 px-2 py-0.5 text-xs font-bold text-white">
                    {displayAlerts.filter((a) => a.severity === "amber").length} warning
                  </span>
                )}
                <span className={cn(displayAlerts.some((a) => a.severity === "red") ? "text-red-700" : "text-amber-700")}>
                  active {displayAlerts.length === 1 ? "alert" : "alerts"} — view in Reports
                </span>
              </span>
            </div>
            <ChevronRight className={cn("h-4 w-4 shrink-0", displayAlerts.some((a) => a.severity === "red") ? "text-red-400" : "text-amber-400")} />
          </Link>
        )}
      </section>

      {/* Site Health Grid */}
      <section>
        <h2 className="mb-3 font-heading text-sm font-black uppercase tracking-wider text-slate-500">
          Site Health
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayHealth.map((site) => {
            const noCoverage = site.totalValeters > 0 && site.clockedIn === 0;
            const underStaffed =
              site.totalValeters > 0 &&
              site.clockedIn > 0 &&
              site.clockedIn < site.totalValeters / 2;

            const statusColor = noCoverage
              ? "border-red-200 bg-red-50"
              : underStaffed
                ? "border-amber-200 bg-amber-50"
                : "border-slate-100 bg-white";

            const barColor = noCoverage
              ? "bg-red-500"
              : underStaffed
                ? "bg-amber-500"
                : "bg-emerald-500";

            return (
              <div
                key={site.siteId}
                className={cn(
                  "rounded-2xl border p-5 shadow-sm",
                  statusColor,
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {site.siteName}
                  </h3>
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      noCoverage
                        ? "bg-red-500"
                        : underStaffed
                          ? "bg-amber-500"
                          : "bg-emerald-500",
                    )}
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-lg font-black text-slate-900">
                      {site.totalValeters}
                    </p>
                    <p className="text-slate-500">Valeters</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900">
                      {site.clockedIn}
                    </p>
                    <p className="text-slate-500">Clocked in</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-slate-900">
                      {site.bookingsToday}
                    </p>
                    <p className="text-slate-500">Jobs today</p>
                  </div>
                </div>
                {/* Capacity bar */}
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                    <span>Capacity</span>
                    <span>{site.capacityPct}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={cn("h-1.5 rounded-full transition-all", barColor)}
                      style={{ width: `${Math.min(100, site.capacityPct)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {displayHealth.length === 0 && (
            <p className="col-span-full text-sm text-slate-400">
              No sites found.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
