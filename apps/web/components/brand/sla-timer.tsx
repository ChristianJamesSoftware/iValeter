"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Countdown to readyByTime. Colour shifts green → amber (80% elapsed) → red (breached).
 */
export function SLATimer({
  readyByTime,
  createdAt,
  className,
}: {
  readyByTime: Date | string;
  createdAt: Date | string;
  className?: string;
}) {
  const ready = new Date(readyByTime).getTime();
  const created = new Date(createdAt).getTime();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = ready - now;
  const totalMs = Math.max(ready - created, 1);
  const elapsedFraction = 1 - remainingMs / totalMs;

  const breached = remainingMs <= 0;
  const approaching = !breached && elapsedFraction >= 0.8;

  const tone = breached
    ? "bg-danger/10 text-danger"
    : approaching
      ? "bg-warning/10 text-warning"
      : "bg-success/10 text-success";

  const absMin = Math.round(Math.abs(remainingMs) / 60000);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const label = `${h > 0 ? `${h}h ` : ""}${m}m`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold",
        tone,
        className,
      )}
    >
      <Clock className="h-4 w-4" />
      {breached ? `${label} overdue` : `${label} left`}
    </span>
  );
}
