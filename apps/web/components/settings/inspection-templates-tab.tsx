"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ClipboardList,
  Building2,
  X,
  Pencil,
  Copy,
  Check,
} from "lucide-react";
import type { RouterOutputs } from "@/lib/trpc/react";

type Template = RouterOutputs["inspectionTemplates"]["listTemplates"][number];
type CheckItem = Template["checkItems"][number];

const TYPE_LABELS: Record<string, string> = {
  PDI: "PDI — New Vehicle",
  USED_TRANSFER: "Used Vehicle Transfer",
  CUSTOM: "Custom",
};

const TYPE_COLOURS: Record<string, string> = {
  PDI: "bg-blue-50 text-blue-700 border-blue-100",
  USED_TRANSFER: "bg-amber-50 text-amber-700 border-amber-100",
  CUSTOM: "bg-purple-50 text-purple-700 border-purple-100",
};

const CATEGORIES = ["Identity & Documents", "Exterior", "Interior", "Mechanical", "Equipment", "Prep", "General"];
const inputCls = "h-9 w-full rounded-lg border border-[#D4D1CA] bg-white px-3 text-sm text-[#28251D] outline-none focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20";

// ─── Inline check item edit row ───────────────────────────────────────────────

function CheckItemRow({ item, templateId }: { item: CheckItem; templateId: string }) {
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(item.label);
  const [category, setCategory] = useState(item.category ?? "General");
  const [isRequired, setIsRequired] = useState(item.isRequired);
  const [description, setDescription] = useState(item.description ?? "");
  const [saved, setSaved] = useState(false);

  const updateCheck = trpc.inspectionTemplates.updateCheckItem.useMutation({
    onSuccess: () => {
      void utils.inspectionTemplates.listTemplates.invalidate();
      setSaved(true);
      setTimeout(() => { setSaved(false); setEditing(false); }, 800);
    },
  });
  const toggleActive = trpc.inspectionTemplates.updateCheckItem.useMutation({
    onSuccess: () => void utils.inspectionTemplates.listTemplates.invalidate(),
  });
  const deleteCheck = trpc.inspectionTemplates.deleteCheckItem.useMutation({
    onSuccess: () => void utils.inspectionTemplates.listTemplates.invalidate(),
  });

  if (editing) {
    return (
      <div className={`border-b border-[#F0EDE8] px-3 py-3 last:border-0 bg-[#01696F]/5 ${!item.isActive ? "opacity-60" : ""}`}>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Check label"
              className={inputCls}
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputCls}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-[#28251D]">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="h-4 w-4 rounded border-[#D4D1CA] text-[#01696F]"
            />
            Required check
          </label>
          <div className="sm:col-span-2">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Guidance note (optional)"
              className={inputCls}
            />
          </div>
        </div>
        {updateCheck.error && <p className="mt-1 text-xs text-red-600">{updateCheck.error.message}</p>}
        <div className="mt-2 flex gap-2 justify-end">
          <button onClick={() => setEditing(false)} className="h-7 px-3 rounded-lg text-xs text-slate-500 hover:bg-slate-100 transition">Cancel</button>
          <button
            onClick={() => updateCheck.mutate({ id: item.id, label, category, isRequired, description: description || undefined })}
            disabled={updateCheck.isPending || label.trim().length < 2}
            className="flex h-7 items-center gap-1 rounded-lg bg-[#01696F] px-3 text-xs font-semibold text-white transition hover:bg-[#015a5f] disabled:opacity-50"
          >
            {updateCheck.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <Check className="h-3 w-3" /> : null}
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-2.5 border-b border-[#F0EDE8] px-3 py-2.5 last:border-0 ${!item.isActive ? "opacity-50" : ""}`}>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#28251D]">
          {item.label}
          {item.isRequired && <span className="ml-1.5 text-[10px] font-semibold text-[#E8650A]">REQUIRED</span>}
        </p>
        {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
        {item.category && item.category !== "General" && (
          <p className="text-[10px] text-slate-300 uppercase tracking-wide mt-0.5">{item.category}</p>
        )}
      </div>
      {/* Edit */}
      <button
        onClick={() => setEditing(true)}
        title="Edit check"
        className="rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-[#01696F] transition shrink-0"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      {/* Hide/show */}
      <button
        onClick={() => toggleActive.mutate({ id: item.id, isActive: !item.isActive })}
        title={item.isActive ? "Hide check" : "Show check"}
        className="rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition shrink-0"
      >
        {item.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      {/* Delete */}
      <button
        onClick={() => { if (!confirm(`Remove "${item.label}"?`)) return; deleteCheck.mutate({ id: item.id }); }}
        disabled={deleteCheck.isPending}
        title="Remove check"
        className="rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-400 transition disabled:opacity-40 shrink-0"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Add Check Item Form ──────────────────────────────────────────────────────

function AddCheckItemForm({ templateId, onClose }: { templateId: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("General");
  const [isRequired, setIsRequired] = useState(true);
  const [description, setDescription] = useState("");

  const addMut = trpc.inspectionTemplates.addCheckItem.useMutation({
    onSuccess: () => { void utils.inspectionTemplates.listTemplates.invalidate(); onClose(); },
  });

  return (
    <div className="rounded-xl border border-[#E8650A]/20 bg-[#E8650A]/5 p-4 space-y-3 mt-2">
      <p className="text-xs font-semibold text-[#1C1A16] uppercase tracking-wide">New Check Item</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Label *</label>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. VIN verified against invoice" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-3 pb-0.5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="h-4 w-4 rounded border-[#D4D1CA] text-[#01696F]" />
            <span className="text-sm text-[#28251D]">Required check</span>
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Description <span className="font-normal text-slate-400">(optional)</span></label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Guidance note for the valeter" className={inputCls} />
        </div>
      </div>
      {addMut.error && <p className="text-xs text-red-600">{addMut.error.message}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="h-8 px-3 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition">Cancel</button>
        <button
          onClick={() => { if (label.trim().length < 2) return; addMut.mutate({ templateId, label, category, isRequired, description: description || undefined }); }}
          disabled={addMut.isPending || label.trim().length < 2}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-[#E8650A] px-4 text-sm font-semibold text-white transition hover:bg-[#c9560a] disabled:opacity-50"
        >
          {addMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add Check
        </button>
      </div>
    </div>
  );
}

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({ template }: { template: Template }) {
  const utils = trpc.useUtils();
  const [expanded, setExpanded] = useState(false);
  const [showAddCheck, setShowAddCheck] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);

  // Header edit state
  const [editName, setEditName] = useState(template.name);
  const [editDesc, setEditDesc] = useState(template.description ?? "");
  const [editType, setEditType] = useState(template.type);
  const [headerSaved, setHeaderSaved] = useState(false);

  const updateTemplate = trpc.inspectionTemplates.updateTemplate.useMutation({
    onSuccess: () => {
      void utils.inspectionTemplates.listTemplates.invalidate();
      setHeaderSaved(true);
      setTimeout(() => { setHeaderSaved(false); setEditingHeader(false); }, 800);
    },
  });
  const deleteTemplate = trpc.inspectionTemplates.deleteTemplate.useMutation({
    onSuccess: () => void utils.inspectionTemplates.listTemplates.invalidate(),
  });
  const duplicateTemplate = trpc.inspectionTemplates.duplicateTemplate.useMutation({
    onSuccess: () => void utils.inspectionTemplates.listTemplates.invalidate(),
  });

  // Group check items by category
  const grouped = template.checkItems.reduce<Record<string, CheckItem[]>>((acc, item) => {
    const cat = item.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(item);
    return acc;
  }, {});

  const siteCount = template._count.siteTemplates;

  return (
    <div className={`rounded-xl border ${template.isActive ? "border-[#D4D1CA]" : "border-slate-200 opacity-60"} bg-white overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition">
        <button onClick={() => setExpanded(!expanded)} className="shrink-0">
          {expanded ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </button>
        <ClipboardList className="h-4 w-4 shrink-0 text-[#E8650A]" />
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-[#28251D]">{template.name}</span>
            <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TYPE_COLOURS[template.type] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
              {TYPE_LABELS[template.type] ?? template.type}
            </span>
            {!template.isActive && (
              <span className="inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Inactive</span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {template.checkItems.length} checks
            {siteCount > 0 && ` · assigned to ${siteCount} site${siteCount !== 1 ? "s" : ""}`}
            {template.description && ` · ${template.description}`}
          </p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Edit header */}
          <button
            onClick={() => { setEditingHeader(true); setExpanded(true); setEditName(template.name); setEditDesc(template.description ?? ""); setEditType(template.type); }}
            title="Edit template"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#01696F] transition"
          >
            <Pencil className="h-4 w-4" />
          </button>
          {/* Duplicate */}
          <button
            onClick={() => { if (!confirm(`Duplicate "${template.name}"?`)) return; duplicateTemplate.mutate({ id: template.id }); }}
            disabled={duplicateTemplate.isPending}
            title="Duplicate template"
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition disabled:opacity-40"
          >
            {duplicateTemplate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
          </button>
          {/* Toggle active */}
          <button
            onClick={() => updateTemplate.mutate({ id: template.id, isActive: !template.isActive })}
            title={template.isActive ? "Deactivate" : "Activate"}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            {template.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          {/* Delete */}
          <button
            onClick={() => { if (!confirm(`Delete "${template.name}"? ${siteCount > 0 ? "It will be deactivated as sites are using it." : "This cannot be undone."}`)) return; deleteTemplate.mutate({ id: template.id }); }}
            disabled={deleteTemplate.isPending}
            title="Delete template"
            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#F0EDE8] px-4 pb-4">

          {/* Inline template editor */}
          {editingHeader && (
            <div className="mt-3 mb-4 rounded-xl border border-[#01696F]/20 bg-[#01696F]/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-[#1C1A16] uppercase tracking-wide">Edit Template</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Template Name *</label>
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
                  <select value={editType} onChange={(e) => setEditType(e.target.value as "PDI" | "USED_TRANSFER" | "CUSTOM")} className={inputCls}>
                    <option value="PDI">PDI — New Vehicle</option>
                    <option value="USED_TRANSFER">Used Vehicle Transfer</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                  <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Short description…" className={inputCls} />
                </div>
              </div>
              {updateTemplate.error && <p className="text-xs text-red-600">{updateTemplate.error.message}</p>}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditingHeader(false)} className="h-8 px-3 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition">Cancel</button>
                <button
                  onClick={() => updateTemplate.mutate({ id: template.id, name: editName, description: editDesc || undefined, isActive: undefined })}
                  disabled={updateTemplate.isPending || editName.trim().length < 2}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-[#01696F] px-4 text-sm font-semibold text-white transition hover:bg-[#015a5f] disabled:opacity-50"
                >
                  {updateTemplate.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : headerSaved ? <Check className="h-3.5 w-3.5" /> : null}
                  {headerSaved ? "Saved" : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {/* Check items */}
          {template.checkItems.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No checks yet — add one below.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1.5">{cat}</p>
                  <div className="rounded-lg border border-[#F0EDE8] overflow-hidden">
                    {(items as CheckItem[]).map((item) => (
                      <CheckItemRow key={item.id} item={item} templateId={template.id} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add check item */}
          {showAddCheck ? (
            <AddCheckItemForm templateId={template.id} onClose={() => setShowAddCheck(false)} />
          ) : (
            <button
              onClick={() => setShowAddCheck(true)}
              className="mt-3 flex items-center gap-1.5 text-sm text-[#01696F] font-medium hover:text-[#015a5f] transition"
            >
              <Plus className="h-3.5 w-3.5" /> Add check item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Template Form ────────────────────────────────────────────────────────

function AddTemplateForm({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [type, setType] = useState<"PDI" | "USED_TRANSFER" | "CUSTOM">("PDI");
  const [description, setDescription] = useState("");

  const createMut = trpc.inspectionTemplates.createTemplate.useMutation({
    onSuccess: () => { void utils.inspectionTemplates.listTemplates.invalidate(); onClose(); },
  });

  return (
    <div className="rounded-xl border border-[#01696F]/20 bg-[#01696F]/5 p-4 space-y-3">
      <p className="text-xs font-semibold text-[#1C1A16] uppercase tracking-wide">New Template</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Template Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. PDI — New Vehicle" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as "PDI" | "USED_TRANSFER" | "CUSTOM")} className={inputCls}>
            <option value="PDI">PDI — New Vehicle</option>
            <option value="USED_TRANSFER">Used Vehicle Transfer</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Description <span className="font-normal text-slate-400">(optional)</span></label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description of this template" className={inputCls} />
        </div>
      </div>
      {createMut.error && <p className="text-xs text-red-600">{createMut.error.message}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} className="h-8 px-3 rounded-lg text-sm text-slate-500 hover:bg-slate-100 transition">Cancel</button>
        <button
          onClick={() => { if (name.trim().length < 2) return; createMut.mutate({ name, type, description: description || undefined }); }}
          disabled={createMut.isPending || name.trim().length < 2}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-[#01696F] px-4 text-sm font-semibold text-white transition hover:bg-[#015a5f] disabled:opacity-50"
        >
          {createMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Create Template
        </button>
      </div>
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function InspectionTemplatesTab() {
  const { data: templates, isLoading } = trpc.inspectionTemplates.listTemplates.useQuery();
  const [showAddTemplate, setShowAddTemplate] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
      </div>
    );
  }

  const activeTemplates = templates?.filter((t) => t.isActive) ?? [];
  const inactiveTemplates = templates?.filter((t) => !t.isActive) ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Info banner */}
      <div className="rounded-xl border border-[#01696F]/20 bg-[#01696F]/5 px-4 py-3 text-sm text-[#28251D]">
        <p className="font-semibold mb-1 flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[#01696F]" />
          Vehicle Inspection Templates
        </p>
        <p className="text-xs text-slate-600">
          Create and edit checklist templates for PDI (new vehicles) and Used Vehicle Transfers.
          Click the <Pencil className="inline h-3 w-3" /> icon to edit a template or any check item.
          Use <Copy className="inline h-3 w-3" /> to duplicate a template as a starting point for a new one.
          Once created, assign them to specific dealership sites.
        </p>
      </div>

      {/* Active templates */}
      <div className="space-y-3">
        {activeTemplates.length === 0 && !showAddTemplate && (
          <div className="rounded-xl border-2 border-dashed border-[#D4D1CA] py-10 text-center">
            <ClipboardList className="h-8 w-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-500">No templates yet</p>
            <p className="text-xs text-slate-400 mt-1">Create a template to start building inspection checklists</p>
          </div>
        )}
        {activeTemplates.map((t) => (
          <TemplateCard key={t.id} template={t} />
        ))}
      </div>

      {/* Add template */}
      {showAddTemplate ? (
        <AddTemplateForm onClose={() => setShowAddTemplate(false)} />
      ) : (
        <button
          onClick={() => setShowAddTemplate(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-[#01696F] hover:text-[#015a5f] transition"
        >
          <Plus className="h-4 w-4" /> Create new template
        </button>
      )}

      {/* Inactive templates */}
      {inactiveTemplates.length > 0 && (
        <details className="rounded-xl border border-slate-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-400 hover:text-slate-600 transition select-none list-none flex items-center gap-2">
            <EyeOff className="h-4 w-4" />
            {inactiveTemplates.length} inactive template{inactiveTemplates.length !== 1 ? "s" : ""}
          </summary>
          <div className="px-4 pb-4 space-y-3 pt-1">
            {inactiveTemplates.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
