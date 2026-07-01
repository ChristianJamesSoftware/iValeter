"use client";

import { useState } from "react";
import { ReportsDashboard } from "@/components/dealership/reports-dashboard";
import { ManagerReportsClient } from "@/components/dealership/manager-reports-client";

type PageTab = "summary" | "manager";

interface Props {
  sites: { id: string; name: string }[];
  defaultSiteId: string;
  managerSiteId: string | null;
  managerSiteName: string | null;
}

export function ReportsPageTabs({
  sites,
  defaultSiteId,
  managerSiteId,
  managerSiteName,
}: Props): React.JSX.Element {
  const showManagerTab = managerSiteId !== null && managerSiteName !== null;

  const [activeTab, setActiveTab] = useState<PageTab>("summary");

  return (
    <div>
      {showManagerTab && (
        <div className="mb-6 flex gap-1 rounded-xl border border-line bg-offwhite p-1 w-fit">
          <button
            onClick={() => setActiveTab("summary")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === "summary"
                ? "bg-white text-navy shadow-sm"
                : "text-slate hover:text-navy"
            }`}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab("manager")}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              activeTab === "manager"
                ? "bg-white text-navy shadow-sm"
                : "text-slate hover:text-navy"
            }`}
          >
            Manager View
          </button>
        </div>
      )}

      {activeTab === "summary" && (
        <ReportsDashboard
          sites={sites}
          defaultSiteId={defaultSiteId}
        />
      )}

      {activeTab === "manager" && showManagerTab && (
        <ManagerReportsClient
          siteId={managerSiteId}
          siteName={managerSiteName}
        />
      )}
    </div>
  );
}
