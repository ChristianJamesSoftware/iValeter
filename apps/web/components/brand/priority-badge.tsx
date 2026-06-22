import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pulsing red priority badge — must be impossible to miss. */
export function PriorityBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white animate-priority-pulse",
        className,
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5" />
      Priority
    </span>
  );
}
