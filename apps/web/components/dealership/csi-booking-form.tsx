"use client";

import React, { useState } from "react";
import { CheckCircle2, Circle, Loader2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Group config ─────────────────────────────────────────────────────────────
// All Tailwind classes must be complete static strings — no string concatenation
// or Tailwind will purge them from the build.

const GROUP_LABELS: Record<string, string> = {
  EXTERIOR:         "Exterior",
  SHOWROOM_LOUNGES: "Showroom & Customer Lounges",
  WORKSHOP:         "Workshop & Behind the Scenes",
};

const GROUP_ICONS: Record<string, string> = {
  EXTERIOR:         "🏢",
  SHOWROOM_LOUNGES: "🛋️",
  WORKSHOP:         "🔧",
};

interface GroupStyle {
  card: string;       // border + wrapper
  header: string;     // header background
  badge: string;      // count badge
  checkFull: string;  // fully selected check icon colour
  checkPartialBorder: string; // partial ring border
  checkPartialFill: string;   // partial ring inner fill
  selectedRow: string; // selected row bg
  selectedText: string; // selected item text colour
}

const GROUP_STYLES: Record<string, GroupStyle> = {
  EXTERIOR: {
    card:               "border-2 border-sky-200",
    header:             "bg-sky-50",
    badge:              "bg-sky-100 text-sky-700",
    checkFull:          "text-sky-600",
    checkPartialBorder: "border-sky-400",
    checkPartialFill:   "bg-sky-400",
    selectedRow:        "bg-sky-50/60",
    selectedText:       "text-sky-700",
  },
  SHOWROOM_LOUNGES: {
    card:               "border-2 border-violet-200",
    header:             "bg-violet-50",
    badge:              "bg-violet-100 text-violet-700",
    checkFull:          "text-violet-600",
    checkPartialBorder: "border-violet-400",
    checkPartialFill:   "bg-violet-400",
    selectedRow:        "bg-violet-50/60",
    selectedText:       "text-violet-700",
  },
  WORKSHOP: {
    card:               "border-2 border-amber-200",
    header:             "bg-amber-50",
    badge:              "bg-amber-100 text-amber-700",
    checkFull:          "text-amber-600",
    checkPartialBorder: "border-amber-400",
    checkPartialFill:   "bg-amber-400",
    selectedRow:        "bg-amber-50/60",
    selectedText:       "text-amber-700",
  },
};

const FALLBACK_STYLE: GroupStyle = {
  card:               "border-2 border-slate-200",
  header:             "bg-slate-50",
  badge:              "bg-slate-100 text-slate-600",
  checkFull:          "text-slate-500",
  checkPartialBorder: "border-slate-400",
  checkPartialFill:   "bg-slate-400",
  selectedRow:        "bg-slate-50",
  selectedText:       "text-slate-700",
};

const GROUP_ORDER = ["EXTERIOR", "SHOWROOM_LOUNGES", "WORKSHOP"];

function groupLabel(key: string): string {
  return GROUP_LABELS[key] ?? key.toLowerCase().split(/[_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function groupIcon(key: string): string { return GROUP_ICONS[key] ?? "📋"; }
function groupStyle(key: string): GroupStyle { return GROUP_STYLES[key] ?? FALLBACK_STYLE; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const INPUT_CLS =
  "h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/30";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-navy">
        {label}{required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-line" />
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function CsiBookingForm(): React.JSX.Element {
  const servicesQuery = trpc.supportServices.list.useQuery();
  const sitesQuery    = trpc.sites.list.useQuery();

  const [selectedIds,     setSelectedIds]    = useState<Set<string>>(new Set());
  const [collapsed,       setCollapsed]      = useState<Set<string>>(new Set());
  const [siteId,          setSiteId]         = useState("");
  const [requiredByDate,  setRequiredByDate]  = useState(todayString());
  const [contactName,     setContactName]     = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [notes,           setNotes]           = useState("");

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
    setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleGroup(group: string) {
    const ids = (grouped[group] ?? []).map((s) => s.id);
    const all = ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => { const n = new Set(prev); all ? ids.forEach((id) => n.delete(id)) : ids.forEach((id) => n.add(id)); return n; });
  }
  function toggleCollapse(group: string) {
    setCollapsed((prev) => { const n = new Set(prev); n.has(group) ? n.delete(group) : n.add(group); return n; });
  }

  const canSubmit =
    selectedIds.size > 0 && siteId && contactName.trim() && requiredByDate && !bookMultiple.isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    const combinedNotes = [specialRequests, notes].filter(Boolean).join(" | ") || undefined;
    bookMultiple.mutate({
      serviceIds: Array.from(selectedIds),
      siteId,
      scheduledDate: new Date(requiredByDate),
      contactName: contactName.trim(),
      notes: combinedNotes,
    });
  }

  function handleMakeAnother() {
    setSubmitted(false); setSelectedIds(new Set()); setSiteId("");
    setRequiredByDate(todayString()); setContactName("");
    setSpecialRequests(""); setNotes(""); bookMultiple.reset();
  }

  // ── Success ──────────────────────────────────────────────────────────────
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
        <button type="button" onClick={handleMakeAnother}
          className="mt-4 h-10 rounded-lg border border-emerald-600 px-4 font-heading text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
          Make another booking
        </button>
      </div>
    );
  }

  if (servicesQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading services…
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

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div className="space-y-5">

        <SectionDivider label="Select Services" />

        {/* Selected count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Choose one or more services below</p>
          {selectedIds.size > 0 && (
            <span className="rounded-full bg-[#01696F] px-2.5 py-0.5 text-xs font-bold text-white">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        {/* Groups */}
        <div className="space-y-3">
          {orderedGroups.map((group) => {
            const groupServices = grouped[group] ?? [];
            const style = groupStyle(group);
            const isCollapsed = collapsed.has(group);
            const selectedInGroup = groupServices.filter((s) => selectedIds.has(s.id)).length;
            const allSelected = groupServices.length > 0 && selectedInGroup === groupServices.length;
            const partialSelected = selectedInGroup > 0 && !allSelected;

            return (
              <div key={group} className={cn("overflow-hidden rounded-xl", style.card)}>
                {/* Group header */}
                <div className={cn("flex items-center gap-3 px-4 py-3.5", style.header)}>
                  <button type="button" onClick={() => toggleGroup(group)} className="shrink-0" aria-label={`Select all ${groupLabel(group)}`}>
                    {allSelected ? (
                      <CheckCircle2 className={cn("h-5 w-5", style.checkFull)} />
                    ) : partialSelected ? (
                      <div className={cn("relative h-5 w-5 rounded-full border-2", style.checkPartialBorder)}>
                        <div className={cn("absolute inset-[3px] rounded-full", style.checkPartialFill)} style={{ clipPath: "inset(0 50% 0 0)" }} />
                      </div>
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300" />
                    )}
                  </button>

                  <span className="text-lg leading-none">{groupIcon(group)}</span>
                  <p className="flex-1 font-heading text-sm font-bold text-[#28251D]">{groupLabel(group)}</p>

                  {selectedInGroup > 0 && (
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", style.badge)}>
                      {selectedInGroup}/{groupServices.length}
                    </span>
                  )}

                  <button type="button" onClick={() => toggleCollapse(group)} className="shrink-0 text-slate-400 hover:text-slate-600">
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {/* Service rows */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100 bg-white">
                    {groupServices.map((svc) => {
                      const isSelected = selectedIds.has(svc.id);
                      return (
                        <button key={svc.id} type="button" onClick={() => toggleService(svc.id)}
                          className={cn(
                            "flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors",
                            isSelected ? style.selectedRow : "hover:bg-slate-50",
                          )}
                        >
                          <span className="shrink-0">
                            {isSelected
                              ? <CheckCircle2 className={cn("h-5 w-5", style.checkFull)} />
                              : <Circle className="h-5 w-5 text-slate-200" />
                            }
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm font-semibold", isSelected ? style.selectedText : "text-[#28251D]")}>
                              {svc.name}
                            </p>
                            {svc.description && (
                              <p className="mt-0.5 truncate text-xs text-slate-400">{svc.description}</p>
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

        <SectionDivider label="Booking Details" />

        <Field label="Site" required>
          {sitesQuery.isLoading ? (
            <div className="flex h-12 items-center text-sm text-slate-400">
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading sites…
            </div>
          ) : (
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className={INPUT_CLS}>
              <option value="">Select a site…</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </Field>

        <Field label="Date Required By" required>
          <input type="date" value={requiredByDate} min={todayString()}
            onChange={(e) => setRequiredByDate(e.target.value)} className={INPUT_CLS} />
        </Field>

        <Field label="Contact Name" required>
          <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
            placeholder="Name of person to contact on site" className={INPUT_CLS} />
        </Field>

        <SectionDivider label="Additional Info" />

        <Field label="Special Requests">
          <input type="text" value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Any specific requirements…" className={INPUT_CLS} />
        </Field>

        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Access instructions, parking, additional details…" rows={3}
            className="w-full resize-none rounded-lg border border-line bg-white px-4 py-3 text-navy outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/30" />
        </Field>

        {bookMultiple.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {bookMultiple.error.message}
          </div>
        )}

        <button type="button" disabled={!canSubmit} onClick={handleSubmit}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#01696F] font-heading text-lg font-bold text-white transition hover:bg-[#015559] disabled:opacity-60">
          {bookMultiple.isPending ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Submitting…</>
          ) : (
            <><Sparkles className="h-5 w-5" />
              {selectedIds.size > 1 ? `Submit ${selectedIds.size} Booking Requests` : "Submit Booking Request"}
            </>
          )}
        </button>

      </div>
    </div>
  );
}
