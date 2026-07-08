"use client";

/**
 * SmsBroadcast
 * ─────────────
 * Ops/manager platform: compose and send SMS broadcasts to valeters.
 *
 * Modes:
 *   • "All active valeters" — one click, no selection needed
 *   • "Select recipients"   — filter by site, pick individuals
 *
 * Sender: TotValeting (11 chars, alphanumeric — one-way, no replies)
 * Provider: The SMS Works — pay per delivered text, undelivered refunded
 */

import React, { useState, useMemo } from "react";
import {
  MessageSquare, Users, CheckSquare, Square, Send,
  ChevronDown, ChevronUp, Smartphone, AlertTriangle,
  CheckCircle2, Info, CreditCard,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Valeter {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string | null;
  siteName: string | null;
}

type Mode = "all" | "select";

// ─── Character / SMS part counter ─────────────────────────────────────────────

function SmsCounter({ text }: { text: string }) {
  const len = text.length;
  // Standard GSM-7: 160 chars = 1 SMS; concatenated: 153 chars/part
  const parts = len === 0 ? 1 : len <= 160 ? 1 : Math.ceil(len / 153);
  const remaining = parts === 1 ? 160 - len : parts * 153 - len;
  return (
    <div className="flex items-center justify-end gap-3 text-xs text-slate-400">
      <span>{len} chars</span>
      <span className={cn(remaining < 20 ? "text-amber-500 font-semibold" : "")}>
        {remaining} remaining
      </span>
      <span className={cn(
        "rounded-full px-2 py-0.5 font-bold",
        parts === 1 ? "bg-emerald-50 text-emerald-600" :
        parts <= 2 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600",
      )}>
        {parts} {parts === 1 ? "SMS" : "SMS parts"}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SmsBroadcast() {
  const [mode, setMode]         = useState<Mode>("all");
  const [message, setMessage]   = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Result state
  const [result, setResult] = useState<{
    batchId: string;
    sent: number;
    skippedCount: number;
    skipped: string[];
  } | null>(null);
  const [err, setErr] = useState("");

  // Queries
  const { data: balance } = trpc.sms.balance.useQuery(undefined, {
    refetchInterval: 120_000,
  });

  const { data: allValeters = [] } = trpc.users.listValeters.useQuery();

  const valeters: Valeter[] = useMemo(
    () => allValeters
      .filter((v) => v.isActive)
      .map((v) => ({
        id:        v.id,
        firstName: v.firstName,
        lastName:  v.lastName,
        mobile:    v.mobile ?? null,
        siteName:  v.siteName ?? null,
      })),
    [allValeters],
  );

  const sites = useMemo(
    () => Array.from(new Set(valeters.map((v) => v.siteName).filter(Boolean) as string[])).sort(),
    [valeters],
  );

  const filtered = useMemo(
    () => siteFilter ? valeters.filter((v) => v.siteName === siteFilter) : valeters,
    [valeters, siteFilter],
  );

  const withMobile    = filtered.filter((v) => v.mobile?.trim());
  const withoutMobile = filtered.filter((v) => !v.mobile?.trim());

  // Mutations
  const utils = trpc.useUtils();

  const broadcastAll = trpc.sms.broadcastAll.useMutation({
    onSuccess: (data) => { setResult(data); setMessage(""); },
    onError:   (e)    => setErr(e.message),
  });

  const broadcast = trpc.sms.broadcast.useMutation({
    onSuccess: (data) => { setResult(data); setMessage(""); setSelected(new Set()); },
    onError:   (e)    => setErr(e.message),
  });

  const isPending = broadcastAll.isPending || broadcast.isPending;

  function toggleAll() {
    if (selected.size === withMobile.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(withMobile.map((v) => v.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSend() {
    setErr("");
    setResult(null);
    if (!message.trim()) { setErr("Please enter a message."); return; }

    if (mode === "all") {
      broadcastAll.mutate({ message: message.trim() });
    } else {
      if (selected.size === 0) { setErr("Please select at least one recipient."); return; }
      broadcast.mutate({ message: message.trim(), valeterIds: Array.from(selected) });
    }
  }

  // Recipient count for preview
  const recipientCount = mode === "all"
    ? valeters.filter((v) => v.mobile?.trim()).length
    : selected.size;

  // Cost estimate (4.4p per SMS, 1 part assumed)
  const costEstimate = recipientCount * 0.044;

  return (
    <div className="space-y-5">

      {/* Header + balance */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <MessageSquare className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-bold text-slate-900">SMS Broadcast</h2>
        </div>
        {balance != null && (
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm">
            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-700">{balance.credits}</span>
            <span className="text-slate-400">SMS credits remaining</span>
          </div>
        )}
      </div>

      {/* Sender info banner */}
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-sm text-blue-700">
          Messages are sent from <span className="font-bold">TotValeting</span>.
          Recipients cannot reply — this is a one-way broadcast channel.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        {(["all", "select"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setSelected(new Set()); setResult(null); setErr(""); }}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition",
              mode === m
                ? "border-[#01696F] bg-[#01696F] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            <Users className="h-4 w-4" />
            {m === "all" ? `All active valeters (${valeters.filter(v => v.mobile?.trim()).length})` : "Select recipients"}
          </button>
        ))}
      </div>

      {/* Select mode — valeter picker */}
      {mode === "select" && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          {/* Site filter */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none focus:border-[#01696F]"
            >
              <option value="">All sites</option>
              {sites.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={toggleAll}
              className="ml-auto flex items-center gap-1.5 text-sm font-semibold text-[#01696F] hover:text-[#0C4E54]"
            >
              {selected.size === withMobile.length && withMobile.length > 0
                ? <><CheckSquare className="h-4 w-4" /> Deselect all</>
                : <><Square className="h-4 w-4" /> Select all</>
              }
            </button>
          </div>

          {/* Valeter list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
            {withMobile.map((v) => (
              <label key={v.id} className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition">
                <input
                  type="checkbox"
                  checked={selected.has(v.id)}
                  onChange={() => toggle(v.id)}
                  className="h-4 w-4 accent-[#01696F]"
                />
                <Smartphone className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span className="flex-1 text-sm font-medium text-slate-800">
                  {v.firstName} {v.lastName}
                </span>
                {v.siteName && (
                  <span className="text-xs text-slate-400">{v.siteName}</span>
                )}
              </label>
            ))}
            {withoutMobile.map((v) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-2.5 opacity-40 cursor-not-allowed">
                <Square className="h-4 w-4 shrink-0 text-slate-300" />
                <Smartphone className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                <span className="flex-1 text-sm text-slate-400">
                  {v.firstName} {v.lastName}
                </span>
                <span className="text-xs text-slate-300 italic">No mobile</span>
              </div>
            ))}
          </div>

          {/* No-mobile warning */}
          {withoutMobile.length > 0 && (
            <div className="border-t border-amber-100 bg-amber-50 px-4 py-2.5 flex items-center gap-2 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {withoutMobile.length} valeter{withoutMobile.length > 1 ? "s" : ""} have no mobile number and cannot receive SMS.
              Add numbers on their valeter profile.
            </div>
          )}
        </div>
      )}

      {/* Message composer */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">Message</label>
        <textarea
          rows={4}
          value={message}
          onChange={(e) => { setMessage(e.target.value); setErr(""); setResult(null); }}
          placeholder="Type your message to valeters here…"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/10 transition resize-none"
          maxLength={612}
        />
        <SmsCounter text={message} />
      </div>

      {/* Cost preview */}
      {recipientCount > 0 && message.trim() && (
        <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
          <Send className="h-4 w-4 text-slate-400" />
          <span className="text-slate-600">
            Sending to <span className="font-bold text-slate-900">{recipientCount} valeter{recipientCount !== 1 ? "s" : ""}</span>
            {" · "}estimated cost <span className="font-bold text-slate-900">~£{costEstimate.toFixed(2)}</span>
            {" · "}undelivered texts are refunded automatically
          </span>
        </div>
      )}

      {/* Error */}
      {err && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {err}
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-700 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            Broadcast sent — {result.sent} message{result.sent !== 1 ? "s" : ""} dispatched
          </div>
          {result.skippedCount > 0 && (
            <p className="text-sm text-amber-700">
              {result.skippedCount} skipped (no mobile): {result.skipped.join(", ")}
            </p>
          )}
          <p className="text-xs text-emerald-600">Batch ID: {result.batchId}</p>
        </div>
      )}

      {/* Send button */}
      <button
        disabled={isPending || !message.trim() || (mode === "select" && selected.size === 0)}
        onClick={handleSend}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1C1A16] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1C1A16]/90 disabled:opacity-40 transition"
      >
        <Send className="h-4 w-4" />
        {isPending
          ? "Sending…"
          : mode === "all"
            ? `Send to all ${valeters.filter(v => v.mobile?.trim()).length} valeters`
            : `Send to ${selected.size} selected`
        }
      </button>

      {/* Low credits warning */}
      {balance != null && balance.credits < 50 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            Only <strong>{balance.credits} credits</strong> remaining.{" "}
            <a href="https://thesmsworks.co.uk/user/buy-sms" target="_blank" rel="noreferrer"
              className="underline font-semibold">Top up at The SMS Works</a>{" "}
            before sending — each SMS costs ~1 credit.
          </span>
        </div>
      )}
    </div>
  );
}
