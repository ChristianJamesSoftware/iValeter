"use client";

/**
 * ConfirmDialog — reusable "are you sure?" modal.
 *
 * Usage:
 *   const [confirm, setConfirm] = useState<ConfirmState | null>(null);
 *
 *   <button onClick={() => setConfirm({ title: "Archive valeter?", description: "...", onConfirm: () => mutate(...) })}>
 *     Archive
 *   </button>
 *
 *   <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />
 */

import { useEffect, useRef } from "react";
import { AlertTriangle, X } from "lucide-react";

export interface ConfirmState {
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

interface Props {
  state: ConfirmState | null;
  onClose: () => void;
  isPending?: boolean;
}

export function ConfirmDialog({ state, onClose, isPending = false }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (state) {
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [state]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state) onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [state, onClose]);

  if (!state) return null;

  const isDanger = state.danger ?? true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-6 shadow-2xl">
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
          isDanger ? "bg-red-50" : "bg-amber-50"
        }`}>
          <AlertTriangle className={`h-6 w-6 ${isDanger ? "text-red-500" : "text-amber-500"}`} />
        </div>

        {/* Content */}
        <h2 id="confirm-title" className="mb-2 text-base font-bold text-slate-900">
          {state.title}
        </h2>
        <p className="mb-6 text-sm text-slate-500 leading-relaxed">
          {state.description}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={() => {
              state.onConfirm();
              onClose();
            }}
            disabled={isPending}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
              isDanger
                ? "bg-red-500 hover:bg-red-600"
                : "bg-orange-500 hover:bg-orange-600"
            }`}
          >
            {isPending ? "Please wait…" : (state.confirmLabel ?? "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
