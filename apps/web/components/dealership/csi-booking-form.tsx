"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Group config ────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = {
  EXTERIOR: "Exterior",
  SHOWROOM_LOUNGES: "Showroom & Customer Lounges",
  WORKSHOP: "Workshop & Behind the Scenes",
};

const GROUP_ICONS: Record<string, string> = {
  EXTERIOR:         "🏢",
  SHOWROOM_LOUNGES: "🛋️",
  WORKSHOP:         "🔧",
};

const GROUP_COLORS: Record<string, { border: string; header: string; badge: string; tick: string }> = {
  EXTERIOR:         { border: "border-sky-200",    header: "bg-sky-50",     badge: "bg-sky-100 text-sky-700",    tick: "bg-sky-500" },
  SHOWROOM_LOUNGES: { border: "border-violet-200", header: "bg-violet-50",  badge: "bg-violet-100 text-violet-700", tick: "bg-violet-500" },
  WORKSHOP:         { border: "border-amber-200",  header: "bg-amber-50",   badge: "bg-amber-100 text-amber-700", tick: "bg-amber-500" },
};

const GROUP_ORDER = ["EXTERIOR", "SHOWROOM_LOUNGES", "WORKSHOP"];

function groupLabel(key: string): string {
  if (GROUP_LABELS[key]) return GROUP_LABELS[key];
  return key.toLowerCase().split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function groupIcon(key: string): string {
  return GROUP_ICONS[key] ?? "📋";
}
function groupColors(key: string) {
  return GROUP_COLORS[key] ?? { border: "border-slate-200", header: "bg-slate-50", badge: "bg-slate-100 text-slate-600", tick: "bg-slate-500" };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const INPUT_CLS =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-navy">
        {label}{required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function CsiBookingForm(): React.JSX.Element {
  const servicesQuery = trpc.supportServices.list.useQuery();
  const sitesQuery    = trpc.sites.list.useQuery();

  // Multi-select service IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Collapsed groups
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [siteId,          setSiteId]          = useState("");
  const [requiredByDate,  setRequiredByDate]   = useState(todayString());
  const [contactName,     setContactName]      = useState("");
  const [specialRequests, setSpecialRequests]  = useState("");
  const [notes,           setNotes]            = useState("");

  const [callbackMode,  setCallbackMode]  = useState(false);
  const [callbackNeeds, setCallbackNeeds] = useState("");

  const [submitted,        setSubmitted]        = useState(false);
  const [submittedContact, setSubmittedContact] = useState("");
  const [submittedCount,   setSubmittedCount]   = useState(0);

  const bookMultiple = trpc.supportServices.bookMultiple.useMutation({
    onSuccess: (_data, vars) => {
      setSubmittedContact(contactName);
      setSubmittedCount(vars.serviceIds.length);
      setSubmitted(true);
    },
  });

  const services = servicesQuery.data ?? [];
  const sites    = sitesQuery.data    ?? [];

  // Build ordered groups
  const grouped: Record<string, typeof services> = {};
  for (const svc of services) {
    const g = svc.group ?? "OTHER";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(svc);
  }
  const orderedGroups = [
    ...GROUP_ORDER.filter((g) => grouped[g]?.length),
    ...Object.keys(grouped).filter((g) => !GROUP_ORDER.includes(g) && grouped[g]?.length),
  ];

  function toggleService(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function toggleGroup(group: string) {
    const groupIds = (grouped[group] ?? []).map((s) => s.id);
    const allSelected = groupIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) { groupIds.forEach((id) => next.delete(id)); }
      else             { groupIds.forEach((id) => next.add(id)); }
      return next;
    });
  }
  function toggleCollapse(group: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  }

  const canSubmit =
    selectedIds.size > 0 &&
    siteId &&
    contactName.trim() &&
    (callbackMode ? callbackNeeds.trim() : requiredByDate) &&
    !bookMultiple.isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    const combinedNotes = callbackMode
      ? ["CALLBACK REQUEST", callbackNeeds, specialRequests, notes].filter(Boolean).join(" | ")
      : [specialRequests, notes].filter(Boolean).join(" | ") || undefined;

    bookMultiple.mutate({
      serviceIds: Array.from(selectedIds),
      siteId,
      scheduledDate: callbackMode ? new Date() : new Date(requiredByDate),
      contactName: contactName.trim(),
      notes: combinedNotes,
    });
  }

  function handleMakeAnother() {
    setSubmitted(false);
    setSelectedIds(new Set());
    setSiteId("");
    setRequiredByDate(todayString());
    setContactName("");
    setSpecialRequests("");
    setNotes("");
    setCallbackMode(false);
    setCallbackNeeds("");
    bookMultiple.reset();
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          <div>
            <p className="font-heading text-lg font-bold text-emerald-800">
              {submittedCount === 1 ? "Booking request submitted" : `${submittedCount} booking requests submitted`}
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Our team will contact <span className="font-semibold">{submittedContact}</span> to confirm.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleMakeAnother}
          className="mt-4 h-10 rounded-lg border border-emerald-600 px-4 font-heading text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          Make another booking
        </button>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (servicesQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading services…
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
        No support services have been configured yet. Contact your administrator.
      </p>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Service selection ─────────────────────────────────────── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-navy">
            Select services <span className="text-danger">*</span>
          </p>
          {selectedIds.size > 0 && (
            <span className="rounded-full bg-[#01696F] px-2.5 py-0.5 text-xs font-bold text-white">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        <div className="space-y-3">
          {orderedGroups.map((group) => {
            const groupServices = grouped[group] ?? [];
            const colors = groupColors(group);
            const isCollapsed = collapsed.has(group);
            const selectedInGroup = groupServices.filter((s) => selectedIds.has(s.id)).length;
            const allInGroupSelected = groupServices.length > 0 && selectedInGroup === groupServices.length;

            return (
              <div key={group} className={cn("overflow-hidden rounded-xl border", colors.border)}>
                {/* Group header */}
                <div className={cn("flex items-center gap-3 px-4 py-3", colors.header)}>
                  {/* Select-all checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className="shrink-0"
                    aria-label={`Select all ${groupLabel(group)}`}
                  >
                    {allInGroupSelected ? (
                      <CheckCircle2 className={cn("h-5 w-5", colors.tick.replace("bg-", "text-"))} />
                    ) : selectedInGroup > 0 ? (
                      // Partial — show a half-filled indicator
                      <div className={cn("relative h-5 w-5 rounded-full border-2", colors.tick.replace("bg-", "border-"))}>
                        <div className={cn("absolute inset-[3px] rounded-full", colors.tick)} style={{ clipPath: "inset(0 50% 0 0)" }} />
                      </div>
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300" />
                    )}
                  </button>

                  <span className="text-base">{groupIcon(group)}</span>

                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#28251D]">{groupLabel(group)}</p>
                  </div>

                  {selectedInGroup > 0 && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", colors.badge)}>
                      {selectedInGroup}/{groupServices.length}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleCollapse(group)}
                    className="shrink-0 text-slate-400 hover:text-slate-600"
                  >
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {/* Service cards */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100 bg-white">
                    {groupServices.map((svc) => {
                      const isSelected = selectedIds.has(svc.id);
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => toggleService(svc.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                            isSelected ? "bg-[#01696F]/5" : "hover:bg-slate-50",
                          )}
                        >
                          {/* Tick */}
                          <span className="shrink-0">
                            {isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-[#01696F]" />
                            ) : (
                              <Circle className="h-5 w-5 text-slate-200" />
                            )}
                          </span>

                          <div className="flex-1 min-w-0">
                            <p className={cn("text-sm font-semibold", isSelected ? "text-[#01696F]" : "text-[#28251D]")}>
                              {svc.name}
                            </p>
                            {svc.description && (
                              <p className="mt-0.5 text-xs text-slate-400 truncate">{svc.description}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Booking details ───────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <p className="text-sm font-semibold text-[#28251D]">Booking Details</p>

        {/* Site */}
        <Field label="Site" required>
          {sitesQuery.isLoading ? (
            <div className="flex h-10 items-center text-sm text-slate-400">
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Loading sites…
            </div>
          ) : (
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className={INPUT_CLS}>
              <option value="">Select a site…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
        </Field>

        {/* Date Required By */}
        {!callbackMode && (
          <Field label="Date Required By" required>
            <input
              type="date"
              value={requiredByDate}
              min={todayString()}
              onChange={(e) => setRequiredByDate(e.target.value)}
              className={INPUT_CLS}
            />
          </Field>
        )}

        {/* Contact Name */}
        <Field label="Contact Name" required>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Name of person to contact on site"
            className={INPUT_CLS}
          />
        </Field>

        {/* Special Requests */}
        <Field label="Special Requests">
          <input
            type="text"
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Any specific requirements…"
            className={INPUT_CLS}
          />
        </Field>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Access instructions, additional details…"
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20"
          />
        </Field>

        {/* Callback mode: What do you need? */}
        {callbackMode && (
          <Field label="What do you need?" required>
            <textarea
              value={callbackNeeds}
              onChange={(e) => setCallbackNeeds(e.target.value)}
              placeholder="Describe what support you need…"
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20"
            />
          </Field>
        )}
      </div>

      {/* ── Error ────────────────────────────────────────────────────── */}
      {bookMultiple.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {bookMultiple.error.message}
        </p>
      )}

      {/* ── Submit ───────────────────────────────────────────────────── */}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="h-14 w-full rounded-lg bg-[#01696F] font-heading text-lg font-bold text-white transition hover:bg-[#015559] disabled:opacity-60"
      >
        {bookMultiple.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            {callbackMode ? "Requesting…" : "Submitting…"}
          </span>
        ) : callbackMode ? "Request a Callback" : (
          selectedIds.size > 1
            ? `Submit ${selectedIds.size} Booking Requests`
            : "Submit Booking Request"
        )}
      </button>

      {/* ── Callback toggle ──────────────────────────────────────────── */}
      {!callbackMode ? (
        <button
          type="button"
          onClick={() => setCallbackMode(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#01696F] font-heading text-sm font-semibold text-[#01696F] transition hover:bg-[#01696F]/10"
        >
          Support with another service
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setCallbackMode(false)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 font-heading text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
        >
          Back to standard booking
        </button>
      )}
    </div>
  );
}
