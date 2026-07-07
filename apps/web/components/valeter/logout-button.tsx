"use client";

import { useState } from "react";
import { LogOut, WifiOff, AlertTriangle } from "lucide-react";
import { pendingCount, replayQueue } from "@/lib/offline-queue";
import { logoutAction } from "@/app/(auth)/login/actions";

export function LogoutButton() {
  const [state, setState] = useState<"idle" | "checking" | "warning" | "syncing">("idle");
  const [pending, setPending] = useState(0);

  async function handleClick() {
    setState("checking");
    const count = await pendingCount();
    if (count > 0) {
      setPending(count);
      setState("warning");
    } else {
      await logoutAction();
    }
  }

  async function syncThenLogout() {
    setState("syncing");
    await replayQueue();
    await logoutAction();
  }

  async function forceLogout() {
    await logoutAction();
  }

  if (state === "warning" || state === "syncing") {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Unsynced actions</p>
              <p className="text-xs text-slate-500">
                {pending} action{pending !== 1 ? "s" : ""} not yet sent to server
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            If you log out now these will be lost. Go online first and sync, or force logout to discard them.
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => void syncThenLogout()}
              disabled={state === "syncing"}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
            >
              <WifiOff className="h-4 w-4" />
              {state === "syncing" ? "Syncing…" : "Sync now then log out"}
            </button>
            <button
              onClick={() => void forceLogout()}
              className="h-11 w-full rounded-xl border border-red-200 bg-red-50 font-semibold text-red-600 transition hover:bg-red-100"
            >
              Discard & log out anyway
            </button>
            <button
              onClick={() => setState("idle")}
              className="h-11 w-full rounded-xl border border-slate-200 text-sm text-slate-500 transition hover:bg-slate-50"
            >
              Cancel — stay logged in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => void handleClick()}
      disabled={state === "checking"}
      className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-white/20 hover:text-white disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      {state === "checking" ? "Checking…" : "Log out"}
    </button>
  );
}
