"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

export function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const buildRef = useRef<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;

    async function check() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { build?: string };
        const build = data.build ?? null;
        if (!build || build === "dev") return;

        if (buildRef.current === null) {
          // First load — store current build, don't show banner
          buildRef.current = build;
        } else if (buildRef.current !== build) {
          // Build changed — new deployment is live
          setUpdateAvailable(true);
        }
      } catch {
        // Silent — don't interrupt the user on network error
      }
    }

    void check();
    timer = setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="flex items-center justify-between gap-4 bg-[#E8650A] px-5 py-2.5 text-white">
      <p className="text-sm font-medium">
        A system update is available — refresh to get the latest version.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30 transition"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh now
      </button>
    </div>
  );
}
