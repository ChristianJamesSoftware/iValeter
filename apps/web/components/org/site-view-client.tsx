"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarTab, JobsTab } from "./site-calendar-jobs";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SiteOption {
  id: string;
  name: string;
}

interface DealershipOption {
  id: string;
  name: string;
  sites: SiteOption[];
}

interface Props {
  dealerships: DealershipOption[];
}

// ─── Main Client ──────────────────────────────────────────────────────────────

type Tab = "calendar" | "jobs";

const TABS: { id: Tab; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "jobs",     label: "All Jobs" },
];

export function SiteViewClient({ dealerships }: Props) {
  const [dealershipId, setDealershipId] = useState<string>(dealerships[0]?.id ?? "");
  const [siteId, setSiteId]             = useState<string>("");
  const [activeTab, setActiveTab]       = useState<Tab>("calendar");

  const selectedDealership = dealerships.find((d) => d.id === dealershipId);
  const sites = selectedDealership?.sites ?? [];

  // Always resolve to a valid site for the selected dealership
  const effectiveSiteId = sites.find((s) => s.id === siteId)?.id ?? sites[0]?.id ?? "";

  function handleDealershipChange(id: string) {
    setDealershipId(id);
    setSiteId("");
  }

  if (dealerships.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[#E8E6E0] py-16 text-center mt-6">
        <Building2 className="mx-auto h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm text-slate-400">No dealerships found</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-5">
      {/* Picker row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {/* Dealership */}
        <div className="flex-1 max-w-xs">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
            Dealership
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={dealershipId}
              onChange={(e) => handleDealershipChange(e.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-[#D4D1CA] bg-white pl-9 pr-8 text-sm font-medium text-[#1C1A16] outline-none focus:border-[#E8650A] focus:ring-2 focus:ring-[#E8650A]/20"
            >
              {dealerships.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Site — only if more than one */}
        {sites.length > 1 && (
          <div className="flex-1 max-w-xs">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
              Site
            </label>
            <select
              value={effectiveSiteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="h-10 w-full rounded-lg border border-[#D4D1CA] bg-white px-3 text-sm font-medium text-[#1C1A16] outline-none focus:border-[#E8650A] focus:ring-2 focus:ring-[#E8650A]/20"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Single-site label */}
        {sites.length === 1 && (
          <p className="flex items-center gap-1.5 text-sm text-slate-500 pb-1">
            <Building2 className="h-4 w-4" /> {sites[0]?.name}
          </p>
        )}
      </div>

      {/* Tabs */}
      {effectiveSiteId && (
        <>
          <div className="flex gap-1 border-b border-[#E8E6E0]">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition",
                  activeTab === id
                    ? "border-[#E8650A] text-[#E8650A]"
                    : "border-transparent text-slate-500 hover:text-[#1C1A16]"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {activeTab === "calendar" && <CalendarTab siteId={effectiveSiteId} />}
          {activeTab === "jobs"     && <JobsTab     siteId={effectiveSiteId} />}
        </>
      )}
    </div>
  );
}
