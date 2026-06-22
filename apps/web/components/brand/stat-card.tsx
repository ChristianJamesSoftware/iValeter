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
    navy: "bg-navy/5 text-navy",
    cyan: "bg-cyan/10 text-cyan-600",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
  } as const;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-line bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className={cn("rounded-lg p-3", accentMap[accent])}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate">
          {title}
        </p>
        <p className="font-heading text-2xl font-bold text-navy">{value}</p>
        {subtitle && <p className="truncate text-xs text-slate">{subtitle}</p>}
      </div>
    </div>
  );
}
