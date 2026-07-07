"use client";

/**
 * DealerInspectionsTab
 * --------------------
 * Per-site inspection template assignment + check overrides.
 *
 * For each site belonging to this dealership:
 *   - Shows all org-level inspection templates
 *   - Allows enabling / disabling each template at this site
 *   - When a template is enabled, expands to show individual checks with
 *     the ability to hide specific checks or add site-specific ones
 */

import { useState } from "react";
import {
  ClipboardList,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  Building2,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import type { RouterOutputs } from "@/lib/trpc/react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SiteInfo {
  id: string;
  name: string;
}

interface Props {
  sites: SiteInfo[];
  dealershipId: string;
}

type SiteAssignment = RouterOutputs["inspectionTemplates"]["getSiteAssignments"][number];
type OverrideData = RouterOutputs["inspectionTemplates"]["getSiteOverrides"];

// ── Type label helpers ────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  PDI: "PDI",
  USED_TRANSFER: "Used Transfer",
  CUSTOM: "Custom",
};

const TYPE_COLOURS: Record<string, string> = {
  PDI: "bg-blue-50 text-blue-700 border-blue-100",
  USED_TRANSFER: "bg-amber-50 text-amber-700 border-amber-100",
  CUSTOM: "bg-purple-50 text-purple-700 border-purple-100",
};

// ── Add Site Check Form ───────────────────────────────────────────────────────

function AddSiteCheckForm({
  siteId,
  templateId,
  onClose,
}: {
  siteId: string;
  templateId: string;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("General");
  const [isRequired, setIsRequired] = useState(false);
  const [description, setDescription] = useState("");

  const addMut = trpc.inspectionTemplates.addSiteCheck.useMutation({
    onSuccess: () => {
      void utils.inspectionTemplates.getSiteOverrides.invalidate();
      onClose();
    },
  });

  const categories = ["Identity & Documents", "Exterior", "Interior", "Mechanical", "Equipment", "Prep", "General"];

  return (
    <div className="mt-2 rounded-xl border border-[#E8650A]/20 bg-[#E8650A]/5 p-3 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1C1A16]">Add Site-Specific Check</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Check label…"
            className="h-8 w-full rounded-lg border border-[#D4D1CA] bg-white px-3 text-sm text-[#28251D] outline-none focus:border-[#E8650A]"
          />
        </div>
        <div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-8 w-full rounded-lg border border-[#D4D1CA] bg-white px-3 text-xs text-[#28251D] outline-none focus:border-[#E8650A]"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-[#28251D]">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-[#D4D1CA] text-[#01696F]"
            />
            Required
          </label>
        </div>
        <div className="col-span-2">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Guidance note (optional)"
            className="h-8 w-full rounded-lg border border-[#D4D1CA] bg-white px-3 text-xs text-[#28251D] outline-none focus:border-[#E8650A]"
          />
        </div>
      </div>
      {addMut.error && <p className="text-xs text-red-600">{addMut.error.message}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="h-7 px-2 text-xs text-slate-500 hover:bg-slate-100 rounded transition">Cancel</button>
        <button
          onClick={() => {
            if (label.trim().length < 2) return;
            addMut.mutate({ siteId, templateId, label, category, isRequired, description: description || undefined });
          }}
          disabled={addMut.isPending || label.trim().length < 2}
          className="flex h-7 items-center gap-1 rounded-lg bg-[#E8650A] px-3 text-xs font-semibold text-white transition hover:bg-[#c9560a] disabled:opacity-50"
        >
          {addMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Add
        </button>
      </div>
    </div>
  );
}

// ── Template Override Editor ──────────────────────────────────────────────────

function TemplateOverrideEditor({
  siteId,
  templateId,
  templateName,
  templateType,
}: {
  siteId: string;
  templateId: string;
  templateName: string;
  templateType: string;
}) {
  const utils = trpc.useUtils();
  const [showAddCheck, setShowAddCheck] = useState(false);

  const { data: overrideData, isLoading } = trpc.inspectionTemplates.getSiteOverrides.useQuery(
    { siteId, templateId },
    { staleTime: 10_000 }
  );

  const hideMut = trpc.inspectionTemplates.hideCheckAtSite.useMutation({
    onSuccess: () => void utils.inspectionTemplates.getSiteOverrides.invalidate(),
  });
  const restoreMut = trpc.inspectionTemplates.restoreCheckAtSite.useMutation({
    onSuccess: () => void utils.inspectionTemplates.getSiteOverrides.invalidate(),
  });
  const removeSiteCheckMut = trpc.inspectionTemplates.removeSiteCheck.useMutation({
    onSuccess: () => void utils.inspectionTemplates.getSiteOverrides.invalidate(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 py-3 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading checks…
      </div>
    );
  }

  if (!overrideData) return null;

  const hiddenIds = new Set(
    overrideData.checkOverrides
      .filter((o) => o.overrideType === "HIDDEN" && o.checkItemId)
      .map((o) => o.checkItemId!)
  );
  const siteAddedChecks = overrideData.checkOverrides.filter((o) => o.overrideType === "ADDED");

  // Group template checks by category
  const grouped: Record<string, typeof overrideData.template.checkItems> = {};
  for (const item of overrideData.template.checkItems) {
    const cat = item.category ?? "General";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  }

  return (
    <div className="pt-3 space-y-3">
      {/* Org-level checks */}
      {overrideData.template.checkItems.length === 0 ? (
        <p className="text-xs text-slate-400 italic">No standard checks defined for this template yet.</p>
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">{cat}</p>
            <div className="rounded-lg border border-[#F0EDE8] divide-y divide-[#F0EDE8] bg-white">
              {items.map((item) => {
                const isHidden = hiddenIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2 px-3 py-2 ${isHidden ? "bg-slate-50" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${isHidden ? "text-slate-400 line-through" : "text-[#28251D]"}`}>
                        {item.label}
                        {item.isRequired && !isHidden && (
                          <span className="ml-1 text-[9px] font-bold text-[#E8650A]">REQ</span>
                        )}
                      </p>
                      {item.description && !isHidden && (
                        <p className="text-[10px] text-slate-400 mt-0.5">{item.description}</p>
                      )}
                    </div>
                    {isHidden ? (
                      <button
                        onClick={() => restoreMut.mutate({ siteId, templateId, checkItemId: item.id })}
                        disabled={restoreMut.isPending}
                        title="Restore this check for this site"
                        className="rounded p-1 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 transition text-[10px] flex items-center gap-0.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => hideMut.mutate({ siteId, templateId, checkItemId: item.id })}
                        disabled={hideMut.isPending}
                        title="Hide this check at this site only"
                        className="rounded p-1 text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Site-added checks */}
      {siteAddedChecks.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#E8650A] mb-1">Site-Specific Checks</p>
          <div className="rounded-lg border border-[#E8650A]/20 divide-y divide-[#F0EDE8] bg-white">
            {siteAddedChecks.map((o) => (
              <div key={o.id} className="flex items-start gap-2 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#28251D]">
                    {o.label}
                    {o.isRequired && <span className="ml-1 text-[9px] font-bold text-[#E8650A]">REQ</span>}
                  </p>
                  {o.description && <p className="text-[10px] text-slate-400 mt-0.5">{o.description}</p>}
                  {o.category && <p className="text-[9px] text-slate-300 mt-0.5 uppercase tracking-wide">{o.category}</p>}
                </div>
                <button
                  onClick={() => {
                    if (!confirm(`Remove "${o.label}" from this site?`)) return;
                    removeSiteCheckMut.mutate({ overrideId: o.id });
                  }}
                  disabled={removeSiteCheckMut.isPending}
                  title="Remove site check"
                  className="rounded p-1 text-slate-300 hover:text-red-400 hover:bg-red-50 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add site-specific check */}
      {showAddCheck ? (
        <AddSiteCheckForm siteId={siteId} templateId={templateId} onClose={() => setShowAddCheck(false)} />
      ) : (
        <button
          onClick={() => setShowAddCheck(true)}
          className="flex items-center gap-1 text-xs font-medium text-[#E8650A] hover:text-[#c9560a] transition"
        >
          <Plus className="h-3 w-3" /> Add site-specific check
        </button>
      )}

      {/* Summary of hidden checks */}
      {hiddenIds.size > 0 && (
        <p className="text-[10px] text-slate-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {hiddenIds.size} standard check{hiddenIds.size !== 1 ? "s" : ""} hidden at this site
        </p>
      )}
    </div>
  );
}

// ── Per-Site Template Row ─────────────────────────────────────────────────────

function SiteTemplateRow({
  assignment,
  siteId,
  templateId,
  templateName,
  templateType,
}: {
  assignment: SiteAssignment["assignment"];
  siteId: string;
  templateId: string;
  templateName: string;
  templateType: string;
}) {
  const utils = trpc.useUtils();
  const [showChecks, setShowChecks] = useState(false);
  const isEnabled = assignment?.isEnabled ?? false;

  const assignMut = trpc.inspectionTemplates.assignToSite.useMutation({
    onSuccess: () => void utils.inspectionTemplates.getSiteAssignments.invalidate(),
  });
  const removeMut = trpc.inspectionTemplates.removeFromSite.useMutation({
    onSuccess: () => void utils.inspectionTemplates.getSiteAssignments.invalidate(),
  });

  return (
    <div className={`rounded-xl border ${isEnabled ? "border-[#01696F]/30 bg-white" : "border-[#F0EDE8] bg-slate-50/40"} overflow-hidden`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <ClipboardList className={`h-4 w-4 shrink-0 ${isEnabled ? "text-[#01696F]" : "text-slate-300"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isEnabled ? "text-[#28251D]" : "text-slate-400"}`}>
              {templateName}
            </span>
            <span className={`inline-flex text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${TYPE_COLOURS[templateType] ?? ""}`}>
              {TYPE_LABELS[templateType] ?? templateType}
            </span>
          </div>
        </div>

        {/* Enable / Disable toggle */}
        <div className="flex items-center gap-2 shrink-0">
          {isEnabled && (
            <button
              onClick={() => setShowChecks(!showChecks)}
              className="flex items-center gap-1 text-xs text-[#01696F] hover:text-[#015a5f] font-medium transition"
            >
              {showChecks ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Checks
            </button>
          )}
          <label className="relative inline-flex h-5 w-9 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={() => {
                if (isEnabled) {
                  removeMut.mutate({ siteId, templateId });
                  setShowChecks(false);
                } else {
                  assignMut.mutate({ siteId, templateId });
                }
              }}
              disabled={assignMut.isPending || removeMut.isPending}
              className="sr-only peer"
            />
            <div className={`h-5 w-9 rounded-full transition-colors duration-200 ${isEnabled ? "bg-[#01696F]" : "bg-slate-200"} peer-disabled:opacity-50`} />
            <div className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${isEnabled ? "translate-x-4" : "translate-x-0"}`} />
          </label>
        </div>
      </div>

      {/* Expandable check overrides */}
      {isEnabled && showChecks && (
        <div className="border-t border-[#F0EDE8] px-4 pb-4">
          <TemplateOverrideEditor
            siteId={siteId}
            templateId={templateId}
            templateName={templateName}
            templateType={templateType}
          />
        </div>
      )}
    </div>
  );
}

// ── Per-Site Panel ────────────────────────────────────────────────────────────

function SitePanel({ site }: { site: SiteInfo }) {
  const [expanded, setExpanded] = useState(false);
  const { data: assignments, isLoading } = trpc.inspectionTemplates.getSiteAssignments.useQuery(
    // getSiteAssignments is per-template, not per-site. We use listTemplates + assignments separately.
    // Workaround: we'll fetch all templates and check each.
    // Actually we need a different approach here — see note below.
    // We'll pass a sentinel templateId; we don't have one.
    // REVISED: The component fetches templates via listTemplates, then getSiteAssignments per template.
    // For the per-site panel we instead use a dedicated query approach below.
    { templateId: "__PLACEHOLDER__" },
    { enabled: false }
  );

  // Fetch all templates, and for each, whether this site has it enabled
  const { data: templates, isLoading: templatesLoading } = trpc.inspectionTemplates.listTemplates.useQuery(
    undefined,
    { enabled: expanded }
  );

  // We need per-template site assignment data. We query each template's assignments
  // but that's N queries. Better: we query all assignments for all templates using the
  // router's getSiteAssignments per template. Since templates is a small list, this is fine.
  // We'll render SiteTemplateRows that each call getSiteAssignments per template.

  // Instead, build a light version: for each template, render a SiteTemplateRow that does its own
  // assignToSite / removeFromSite logic, and we pass in the initial "isEnabled" from listTemplates._count.
  // The toggle calls assignToSite/removeFromSite which upserts SiteInspectionTemplate rows.

  const enabledCount = templates?.filter(
    (t) => t.isActive && t._count.siteTemplates > 0
  ).length ?? 0;

  return (
    <div className={`rounded-xl border ${expanded ? "border-[#D4D1CA]" : "border-[#F0EDE8]"} bg-white overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        <Building2 className="h-4 w-4 text-slate-400" />
        <span className="flex-1 text-sm font-semibold text-[#28251D]">{site.name}</span>
        {enabledCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-[#01696F] font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {enabledCount} template{enabledCount !== 1 ? "s" : ""} on
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-[#F0EDE8] px-4 pb-4">
          {templatesLoading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading templates…
            </div>
          ) : (templates?.filter((t) => t.isActive) ?? []).length === 0 ? (
            <p className="py-4 text-sm text-slate-400 text-center">
              No active templates. Create templates in Ops Settings → Inspection Templates.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <SiteTemplateSection siteId={site.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Site Template Section (fetches assignments for this site across templates) ─

function SiteTemplateSection({ siteId }: { siteId: string }) {
  const { data: templates } = trpc.inspectionTemplates.listTemplates.useQuery();
  const activeTemplates = templates?.filter((t) => t.isActive) ?? [];

  // We need to know which templates are already enabled at this site.
  // We'll query getSiteAssignments for each template independently.
  // But that's N queries. Better: use one query per template rendered via dedicated sub-component.
  // Each SiteTemplateAssignmentRow fetches its own assignment status.

  return (
    <div className="space-y-2">
      {activeTemplates.map((t) => (
        <SiteTemplateAssignmentRow
          key={t.id}
          siteId={siteId}
          templateId={t.id}
          templateName={t.name}
          templateType={t.type}
        />
      ))}
    </div>
  );
}

// ── Site Template Assignment Row (per template, per site) ─────────────────────

function SiteTemplateAssignmentRow({
  siteId,
  templateId,
  templateName,
  templateType,
}: {
  siteId: string;
  templateId: string;
  templateName: string;
  templateType: string;
}) {
  const utils = trpc.useUtils();
  const [showChecks, setShowChecks] = useState(false);

  // Fetch assignment status for this template across all sites, then find ours
  const { data: assignments, isLoading } = trpc.inspectionTemplates.getSiteAssignments.useQuery({ templateId });
  const assignment = assignments?.find((a) => a.id === siteId)?.assignment ?? null;
  const isEnabled = assignment?.isEnabled ?? false;

  const assignMut = trpc.inspectionTemplates.assignToSite.useMutation({
    onSuccess: () => void utils.inspectionTemplates.getSiteAssignments.invalidate({ templateId }),
  });
  const removeMut = trpc.inspectionTemplates.removeFromSite.useMutation({
    onSuccess: () => {
      void utils.inspectionTemplates.getSiteAssignments.invalidate({ templateId });
      setShowChecks(false);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin" /> {templateName}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${isEnabled ? "border-[#01696F]/30 bg-white" : "border-[#F0EDE8] bg-slate-50/40"} overflow-hidden`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <ClipboardList className={`h-4 w-4 shrink-0 ${isEnabled ? "text-[#01696F]" : "text-slate-300"}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${isEnabled ? "text-[#28251D]" : "text-slate-400"}`}>
              {templateName}
            </span>
            <span className={`inline-flex text-[9px] font-semibold px-1.5 py-0.5 rounded-full border ${TYPE_COLOURS[templateType] ?? ""}`}>
              {TYPE_LABELS[templateType] ?? templateType}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isEnabled && (
            <button
              onClick={() => setShowChecks(!showChecks)}
              className="flex items-center gap-1 text-xs text-[#01696F] hover:text-[#015a5f] font-medium transition"
            >
              {showChecks ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              Customise
            </button>
          )}
          <label className="relative inline-flex h-5 w-9 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={() => {
                if (isEnabled) {
                  removeMut.mutate({ siteId, templateId });
                } else {
                  assignMut.mutate({ siteId, templateId });
                }
              }}
              disabled={assignMut.isPending || removeMut.isPending}
              className="sr-only peer"
            />
            <div className={`h-5 w-9 rounded-full transition-colors duration-200 ${isEnabled ? "bg-[#01696F]" : "bg-slate-200"} peer-disabled:opacity-50`} />
            <div className={`absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${isEnabled ? "translate-x-4" : "translate-x-0"}`} />
          </label>
        </div>
      </div>

      {isEnabled && showChecks && (
        <div className="border-t border-[#F0EDE8] px-4 pb-4">
          <TemplateOverrideEditor
            siteId={siteId}
            templateId={templateId}
            templateName={templateName}
            templateType={templateType}
          />
        </div>
      )}
    </div>
  );
}

// ── Main Tab ──────────────────────────────────────────────────────────────────

export function DealerInspectionsTab({ sites, dealershipId }: Props) {
  if (sites.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-[#D4D1CA] py-10 text-center">
        <Building2 className="h-8 w-8 mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-400">No sites for this dealership yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Info */}
      <div className="rounded-xl border border-[#01696F]/20 bg-[#01696F]/5 px-4 py-3 text-sm text-[#28251D]">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[#01696F]" />
          Inspection Templates — Site Assignment
        </p>
        <p className="text-xs text-slate-600">
          Enable inspection templates for each site at this dealership. Use <strong>Customise</strong> to
          hide specific standard checks or add site-specific ones. Manage the master templates in
          Ops Settings → Inspection Templates.
        </p>
      </div>

      {/* One panel per site */}
      <div className="space-y-3">
        {sites.map((site) => (
          <SitePanel key={site.id} site={site} />
        ))}
      </div>
    </div>
  );
}
