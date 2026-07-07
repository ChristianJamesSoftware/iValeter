"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronRight, ChevronDown, Users, Clock, Briefcase, X, Car, UserCheck } from "lucide-react";
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

/** Slide-over panel showing a site's valeters + today's bookings */
function SiteSlideOver({
  siteId,
  onClose,
}: {
  siteId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = trpc.hq.siteSnapshot.useQuery({ siteId });

  const STATUS_LABELS: Record<string, string> = {
    PENDING: "Pending",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Site Snapshot</p>
            <h2 className="font-heading text-lg font-bold text-slate-900">
              {isLoading ? "Loading…" : data?.siteName}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <>
              {/* Valeters */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Valeters ({data?.valeters.length ?? 0})
                </h3>
                {data?.valeters.length === 0 ? (
                  <p className="text-sm text-slate-400">No valeters assigned to this site.</p>
                ) : (
                  <div className="space-y-2">
                    {data?.valeters.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                      >
                        <div className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          v.clockedIn ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                        )}>
                          <UserCheck className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800">{v.name}</p>
                          <p className={cn(
                            "text-xs font-medium",
                            v.clockedIn ? "text-emerald-600" : "text-slate-400"
                          )}>
                            {v.clockedIn ? "Clocked in" : "Not clocked in"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Today's bookings */}
              <section>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                  Today's Jobs ({data?.bookings.length ?? 0})
                </h3>
                {data?.bookings.length === 0 ? (
                  <p className="text-sm text-slate-400">No bookings today.</p>
                ) : (
                  <div className="space-y-2">
                    {data?.bookings.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Car className="h-4 w-4 shrink-0 text-slate-400" />
                            <span className="font-mono text-sm font-bold text-slate-800">{b.vehicleReg}</span>
                            {b.vehicleSize && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{b.vehicleSize}</span>
                            )}
                          </div>
                          <span className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-semibold",
                            b.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" :
                            b.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                            b.status === "CANCELLED" ? "bg-red-100 text-red-600" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {STATUS_LABELS[b.status] ?? b.status}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{b.vehicleDesc}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {b.serviceType}{b.customerName ? ` · ${b.customerName}` : ""}
                          {b.readyByTime ? ` · Ready by ${new Date(b.readyByTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        {/* Footer — link to full site view */}
        <div className="border-t border-slate-100 p-4">
          <Link
            href={`/org?siteId=${siteId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-3 text-sm font-bold text-white transition hover:bg-navy/90"
          >
            Open Full Site View
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </>
  );
}

function TrafficBox({
  status,
  sites,
}: {
  status: TrafficLight;
  sites: SiteHealth[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const cfg = TRAFFIC_CONFIG[status];

  return (
    <>
      {selectedSiteId && (
        <SiteSlideOver siteId={selectedSiteId} onClose={() => setSelectedSiteId(null)} />
      )}
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
          <span className={cn("h-4 w-4 shrink-0 rounded-full", cfg.dot)} />
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-slate-800">{cfg.label}</p>
            <p className={cn("text-2xl font-black leading-tight", cfg.count)}>
              {sites.length}{" "}
              <span className="text-sm font-semibold">
                {sites.length === 1 ? "site" : "sites"}
              </span>
            </p>
          </div>
          {sites.length > 0 && (
            open
              ? <ChevronDown className={cn("h-4 w-4 shrink-0", cfg.chevron)} />
              : <ChevronRight className={cn("h-4 w-4 shrink-0", cfg.chevron)} />
          )}
        </button>

        {/* Expandable site list — opens in new tab */}
        {open && sites.length > 0 && (
          <div className="bg-white divide-y divide-slate-100">
            {sites.map((site) => (
              <Link
                key={site.siteId}
                href={`/org?siteId=${site.siteId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-4 px-5 py-3 transition-colors",
                  cfg.row,
                )}
              >
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
    </>
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
