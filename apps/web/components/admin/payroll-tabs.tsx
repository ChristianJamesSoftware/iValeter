"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { PayrollClient } from "@/components/admin/payroll-client";
import { PayrollSiteSummary } from "@/components/admin/payroll-site-summary";

const TABS = [
  { key: "individual", label: "Individual Timesheets" },
  { key: "sites",      label: "Site Summary & Send" },
] as const;

type Tab = (typeof TABS)[number]["key"];

export function PayrollTabs({ initialWeekStart }: { initialWeekStart: string }) {
  const [tab, setTab] = useState<Tab>("individual");

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all",
              tab === t.key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "individual" && <PayrollClient initialWeekStart={initialWeekStart} />}
      {tab === "sites"      && <PayrollSiteSummary initialWeekStart={initialWeekStart} />}
    </div>
  );
}
