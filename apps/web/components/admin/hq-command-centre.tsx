"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Send, Users, Loader2 } from "lucide-react";
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

type Site = {
  id: string;
  name: string;
};

interface HqCommandCentreProps {
  sites: Site[];
}

const AUDIENCE_OPTIONS = [
  { value: "all" as const, label: "All Users" },
  { value: "valeter" as const, label: "All Valeters" },
  { value: "org_admin" as const, label: "All Managers" },
  { value: "dealership_user" as const, label: "All Customers" },
];

export function HqCommandCentre({ sites }: HqCommandCentreProps) {
  // Alerts — auto-refresh every 60s
  const { data: alerts } = trpc.hq.alerts.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const { data: siteHealth } = trpc.hq.siteHealth.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  // Broadcast form state
  const [audience, setAudience] = useState<"all" | "valeter" | "org_admin" | "dealership_user">("valeter");
  const [broadcastSiteId, setBroadcastSiteId] = useState<string>("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  const broadcastMutation = trpc.hq.broadcast.useMutation({
    onSuccess: (data) => {
      setBroadcastSuccess(`Sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}`);
      setBroadcastBody("");
      setTimeout(() => setBroadcastSuccess(null), 4000);
    },
  });

  function handleBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastBody.trim()) return;
    broadcastMutation.mutate({
      role: audience,
      siteId: broadcastSiteId || undefined,
      body: broadcastBody.trim(),
    });
  }

  const displayAlerts = alerts ?? [];
  const displayHealth = siteHealth ?? [];

  return (
    <div className="space-y-6">
      {/* Live Alerts */}
      <section>
        <h2 className="mb-3 font-heading text-sm font-black uppercase tracking-wider text-slate-500">
          Live Alerts
        </h2>
        {displayAlerts.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="All clear" />
            <span className="text-sm font-semibold text-emerald-700">
              All clear — no active alerts
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            {displayAlerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-4",
                  alert.severity === "red"
                    ? "border-red-100 bg-red-50"
                    : "border-amber-100 bg-amber-50",
                )}
              >
                <AlertTriangle
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    alert.severity === "red" ? "text-red-600" : "text-amber-600",
                  )}
                  aria-label={alert.severity === "red" ? "Critical alert" : "Warning"}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      alert.severity === "red" ? "text-red-900" : "text-amber-900",
                    )}
                  >
                    {alert.message}
                  </p>
                  {alert.siteName && (
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        alert.severity === "red" ? "text-red-600" : "text-amber-600",
                      )}
                    >
                      {alert.siteName}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider",
                    alert.severity === "red"
                      ? "bg-red-200 text-red-800"
                      : "bg-amber-200 text-amber-800",
                  )}
                >
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
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

      {/* Quick Broadcast */}
      <section>
        <h2 className="mb-3 font-heading text-sm font-black uppercase tracking-wider text-slate-500">
          Quick Broadcast
        </h2>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <form onSubmit={handleBroadcast} className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[160px]">
                <label
                  htmlFor="broadcast-audience"
                  className="mb-1 block text-xs font-semibold text-slate-600"
                >
                  Audience
                </label>
                <select
                  id="broadcast-audience"
                  value={audience}
                  onChange={(e) =>
                    setAudience(
                      e.target.value as typeof audience,
                    )
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {AUDIENCE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[160px]">
                <label
                  htmlFor="broadcast-site"
                  className="mb-1 block text-xs font-semibold text-slate-600"
                >
                  Site (optional)
                </label>
                <select
                  id="broadcast-site"
                  value={broadcastSiteId}
                  onChange={(e) => setBroadcastSiteId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">All sites</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label
                htmlFor="broadcast-body"
                className="mb-1 block text-xs font-semibold text-slate-600"
              >
                Message
              </label>
              <textarea
                id="broadcast-body"
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                rows={3}
                placeholder="Type your message to broadcast…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={broadcastMutation.isPending || !broadcastBody.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {broadcastMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-label="Sending" />
                ) : (
                  <Send className="h-4 w-4" aria-label="Send" />
                )}
                {broadcastMutation.isPending ? "Sending…" : "Send Broadcast"}
              </button>
              {broadcastSuccess && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                  <Users className="h-4 w-4" aria-label="Recipients" />
                  {broadcastSuccess}
                </span>
              )}
              {broadcastMutation.isError && (
                <span className="text-sm text-red-600">
                  Failed to send — please try again.
                </span>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
