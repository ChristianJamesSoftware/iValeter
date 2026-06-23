import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  icon: Icon,
  title,
  value,
  subtitle,
  accent = "navy",
  className,
}: {
  icon: LucideIcon;
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "navy" | "cyan" | "warning" | "success" | "danger";
  className?: string;
}) {
  const accentMap = {
    navy: "bg-slate-100 text-slate-700",
    cyan: "bg-orange-50 text-orange-600",
    warning: "bg-amber-50 text-amber-600",
    success: "bg-emerald-50 text-emerald-600",
    danger: "bg-red-50 text-red-600",
  } as const;

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-150 hover:border-slate-300 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
          {title}
        </p>
        <div className={cn("rounded-lg p-2.5", accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 truncate text-xs text-slate-400">{subtitle}</p>
      )}
    </div>
  );
}
