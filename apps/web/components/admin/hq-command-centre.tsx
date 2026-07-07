"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, ChevronDown, Users, Clock, Briefcase } from "lucide-react";
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

type TrafficLight = "red" | "amber" | "green";

function getSiteStatus(site: SiteHealth): TrafficLight {
  const noCoverage = site.totalValeters > 0 && site.clockedIn === 0;
  const underStaffed =
    site.totalValeters > 0 &&
    site.clockedIn > 0 &&
    site.clockedIn < site.totalValeters / 2;
  if (noCoverage) return "red";
  if (underStaffed) return "amber";
  return "green";
}

const TRAFFIC_CONFIG = {
  red: {
    label: "Needs Attention",
    dot: "bg-red-500",
    box: "border-red-200 bg-red-50 hover:bg-red-100",
    boxActive: "border-red-300 bg-red-100",
    count: "text-red-700",
    chevron: "text-red-400",
    row: "border-red-100 hover:bg-red-50",
    badge: "bg-red-500",
  },
  amber: {
    label: "Under-staffed",
    dot: "bg-amber-400",
    box: "border-amber-200 bg-amber-50 hover:bg-amber-100",
    boxActive: "border-amber-300 bg-amber-100",
    count: "text-amber-700",
    chevron: "text-amber-400",
    row: "border-amber-100 hover:bg-amber-50",
    badge: "bg-amber-400",
  },
  green: {
    label: "All Good",
    dot: "bg-emerald-500",
    box: "border-emerald-200 bg-emerald-50 hover:bg-emerald-100",
    boxActive: "border-emerald-300 bg-emerald-100",
    count: "text-emerald-700",
    chevron: "text-emerald-400",
    row: "border-emerald-100 hover:bg-emerald-50",
    badge: "bg-emerald-500",
  },
};

function TrafficBox({
  status,
  sites,
}: {
  status: TrafficLight;
  sites: SiteHealth[];
}) {
  const [open, setOpen] = useState(false);
  const cfg = TRAFFIC_CONFIG[status];

  return (
    <div className="rounded-2xl border shadow-sm overflow-hidden">
      {/* Summary row — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={sites.length === 0}
        className={cn(
          "w-full flex items-center gap-4 px-5 py-4 transition-colors",
          open ? cfg.boxActive : cfg.box,
          sites.length === 0 && "opacity-50 cursor-default",
        )}
      >
        {/* Traffic light dot */}
        <span className={cn("h-4 w-4 shrink-0 rounded-full", cfg.dot)} />

        {/* Label + count */}
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-slate-800">{cfg.label}</p>
          <p className={cn("text-2xl font-black leading-tight", cfg.count)}>
            {sites.length}{" "}
            <span className="text-sm font-semibold">
              {sites.length === 1 ? "site" : "sites"}
            </span>
          </p>
        </div>

        {/* Chevron */}
        {sites.length > 0 && (
          open
            ? <ChevronDown className={cn("h-4 w-4 shrink-0", cfg.chevron)} />
            : <ChevronRight className={cn("h-4 w-4 shrink-0", cfg.chevron)} />
        )}
      </button>

      {/* Expandable site list */}
      {open && sites.length > 0 && (
        <div className="bg-white divide-y divide-slate-100">
          {sites.map((site) => (
            <Link
              key={site.siteId}
              href={`/org?siteId=${site.siteId}`}
              className={cn(
                "flex items-center gap-4 px-5 py-3 transition-colors",
                cfg.row,
              )}
            >
              {/* Site name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {site.siteName}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {site.clockedIn}/{site.totalValeters} in
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {site.bookingsToday} jobs
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {site.capacityPct}%
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function HqCommandCentre() {
  const { data: alerts } = trpc.hq.alerts.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const { data: siteHealth } = trpc.hq.siteHealth.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const displayAlerts = alerts ?? [];
  const displayHealth = siteHealth ?? [];

  // Bucket sites by traffic light status
  const red    = displayHealth.filter((s) => getSiteStatus(s) === "red");
  const amber  = displayHealth.filter((s) => getSiteStatus(s) === "amber");
  const green  = displayHealth.filter((s) => getSiteStatus(s) === "green");

  return (
    <div className="space-y-6">
      {/* Live Alerts */}
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

      {/* Site Health — 3 traffic light boxes */}
      <section>
        <h2 className="mb-3 font-heading text-sm font-black uppercase tracking-wider text-slate-500">
          Site Health
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TrafficBox status="red"   sites={red}   />
          <TrafficBox status="amber" sites={amber} />
          <TrafficBox status="green" sites={green} />
        </div>
      </section>
    </div>
  );
}
