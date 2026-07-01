"use client";

import { useState } from "react";
import { PlatformReportsClient } from "./platform-reports-client";
import { ReportsClient } from "@/components/org/reports-client";
import { cn } from "@/lib/utils";

type Tab = "platform" | "detailed";

export function AdminReportsTabs(): React.JSX.Element {
  const [tab, setTab] = useState<Tab>("platform");

  return (
    <div>
      <div className="mb-6 flex gap-1 border-b border-[#D4D1CA]">
        {(
          [
            { key: "platform" as Tab, label: "Platform Overview" },
            { key: "detailed" as Tab, label: "Detailed Reports" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              tab === t.key
                ? "border-[#01696F] text-[#01696F]"
                : "border-transparent text-[#7A7974] hover:text-[#28251D]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "platform" && <PlatformReportsClient />}
      {tab === "detailed" && <ReportsClient />}
    </div>
  );
}
