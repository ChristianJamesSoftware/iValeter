"use client";

import { cn } from "@/lib/utils";

export interface TabDef {
  key: string;
  label: string;
}

export function SettingsTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="mb-6 border-b border-line">
      <div className="flex flex-wrap gap-1">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={cn(
                "relative px-4 py-3 font-heading text-sm font-semibold transition",
                isActive
                  ? "text-navy"
                  : "text-slate hover:text-navy",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "absolute inset-x-2 -bottom-px h-0.5 rounded-full transition",
                  isActive ? "bg-cyan" : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
