"use client";

import { useEffect, useState } from "react";
import { WifiOff, CheckCircle2, RefreshCw } from "lucide-react";
import { getPendingActions, replayQueue, type QueuedAction } from "@/lib/offline-queue";

const TYPE_LABELS: Record<string, string> = {
  CLOCK_IN:   "Clock in",
  CLOCK_OUT:  "Clock out",
  JOB_STATUS: "Job update",
};

export function OfflineQueueStatus() {
  const [actions, setActions] = useState<QueuedAction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  async function refresh() {
    const pending = await getPendingActions();
    setActions(pending);
  }

  useEffect(() => {
    void refresh();
    // Poll every 10s so badge updates after background sync
    const interval = setInterval(() => void refresh(), 10_000);
    // Also refresh when coming back online
    window.addEventListener("online", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", refresh);
    };
  }, []);

  async function handleSync() {
    if (!navigator.onLine) return;
    setSyncing(true);
    await replayQueue();
    await refresh();
    setLastSynced(new Date());
    setSyncing(false);
  }

  if (actions.length === 0) return null;

  return (
    <div className="mx-4 mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="text-sm font-semibold text-amber-800">
            {actions.length} unsynced action{actions.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => void handleSync()}
            disabled={syncing || clearing || !navigator.onLine}
            className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1 text-xs font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
          >
            {syncing
              ? <><RefreshCw className="h-3 w-3 animate-spin" />Syncing…</>
              : <><CheckCircle2 className="h-3 w-3" />Sync</>
            }
          </button>
          <button
            onClick={async () => { setClearing(true); await clearQueue(); await refresh(); setClearing(false); }}
            disabled={syncing || clearing}
            className="rounded-lg border border-amber-300 px-2 py-1 text-xs font-bold text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
          >
            {clearing ? "…" : "Clear"}
          </button>
        </div>
      </div>
      <ul className="mt-2 space-y-1">
        {actions.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-xs text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
            {TYPE_LABELS[a.type] ?? a.type}
            <span className="text-amber-500 ml-auto">
              {new Date(a.queuedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </li>
        ))}
      </ul>
      {lastSynced && actions.length === 0 && (
        <p className="mt-1 text-xs text-amber-600">Synced at {lastSynced.toLocaleTimeString("en-GB")}</p>
      )}
    </div>
  );
}
