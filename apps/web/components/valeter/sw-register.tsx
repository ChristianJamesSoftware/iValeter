"use client";
import { useEffect, useState } from "react";
import { replayQueue, getPendingActions } from "@/lib/offline-queue";
import { useRouter } from "next/navigation";

export function SwRegister() {
  const [isOffline, setIsOffline]   = useState(false);
  const [pendingSync, setPendingSync] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Register SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/valeter/" })
        .catch(err => console.warn("SW registration failed:", err));
    }

    // Track pending queue count
    async function refreshCount() {
      const actions = await getPendingActions();
      setPendingSync(actions.length);
    }
    void refreshCount();

    // Online/offline listeners
    const goOffline = () => setIsOffline(true);
    const goOnline  = async () => {
      setIsOffline(false);
      // Fallback replay (for browsers without Background Sync)
      try {
        // Tell SW to replay first (uses cookies/session)
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: "REPLAY_QUEUE" });
        } else {
          // Direct replay if SW not controlling
          await replayQueue();
        }
      } catch {
        // silent
      }
      await refreshCount();
    };

    window.addEventListener("offline", goOffline);
    window.addEventListener("online",  () => void goOnline());
    setIsOffline(!navigator.onLine);

    // Listen for SW telling us the queue was replayed
    function onSwMessage(event: MessageEvent) {
      if (event.data?.type === "QUEUE_REPLAYED") {
        void refreshCount();
        router.refresh();
      }
    }
    navigator.serviceWorker?.addEventListener("message", onSwMessage);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online",  () => void goOnline());
      navigator.serviceWorker?.removeEventListener("message", onSwMessage);
    };
  }, [router]);

  return (
    <>
      {isOffline && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-semibold text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="23" y2="23"/>
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
            <line x1="12" y1="20" x2="12.01" y2="20"/>
          </svg>
          You&apos;re offline — actions will sync automatically when signal returns
          {pendingSync > 0 && (
            <span className="ml-1 rounded-full bg-white/30 px-1.5 py-0.5 text-xs">
              {pendingSync} pending
            </span>
          )}
        </div>
      )}

      {!isOffline && pendingSync > 0 && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2 bg-emerald-500 px-4 py-2 text-sm font-semibold text-white">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
          </svg>
          Back online — syncing {pendingSync} action{pendingSync !== 1 ? "s" : ""}…
        </div>
      )}
    </>
  );
}
