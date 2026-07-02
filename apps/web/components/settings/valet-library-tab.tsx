"use client";

import { useState } from "react";
import { PlusCircle, Pencil, Power, ChevronDown, ChevronRight, PoundSterling, Clock, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

type Category = "VALET" | "PAINT" | "CLEANING" | "OTHER";
type DeptType = "SALES" | "SERVICE" | "BODYSHOP" | "HIRE" | "ALL";

const CATEGORY_LABELS: Record<Category, string> = {
  VALET:   "Valet",
  PAINT:   "Paint",
  CLEANING:"Cleaning",
  OTHER:   "Other",
};

const CATEGORY_COLORS: Record<Category, string> = {
  VALET:   "bg-blue-100 text-blue-700",
  PAINT:   "bg-purple-100 text-purple-700",
  CLEANING:"bg-amber-100 text-amber-700",
  OTHER:   "bg-green-100 text-green-700",
};

const DEPT_LABELS: Record<DeptType, string> = {
  SALES:    "Sales",
  SERVICE:  "Service",
  BODYSHOP: "Bodyshop",
  HIRE:     "Hire",
  ALL:      "All",
};

const DEPT_COLORS: Record<DeptType, string> = {
  SALES:    "bg-sky-100 text-sky-700",
  SERVICE:  "bg-violet-100 text-violet-700",
  BODYSHOP: "bg-orange-100 text-orange-700",
  HIRE:     "bg-teal-100 text-teal-700",
  ALL:      "bg-slate-100 text-slate-600",
};

const inputCls = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";

// ─── Valet Type Library ───────────────────────────────────────────────────────

export function ValetLibraryTab() {
  const [activeSection, setActiveSection] = useState<"types" | "rates">("types");

  return (
    <div className="space-y-4">
      {/* Section switcher */}
      <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {(["types", "rates"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${
              activeSection === s
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {s === "types" ? "Valet Types" : "Rate Templates"}
          </button>
        ))}
      </div>

      {activeSection === "types" && <ValetTypesSection />}
      {activeSection === "rates" && <RateTemplatesSection />}
    </div>
  );
}

// ─── Valet Types Section ──────────────────────────────────────────────────────

function ValetTypesSection() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", valetCode: "", nominalCode: "", description: "", category: "VALET" as Category, departmentType: "ALL" as DeptType, defaultDurationMins: 60, sortOrder: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<typeof form & { id: string } | null>(null);

  const utils = trpc.useUtils();
  const list = trpc.valetLibrary.listAllValetTypes.useQuery();
  const create = trpc.valetLibrary.createValetType.useMutation({
    onSuccess: () => { utils.valetLibrary.listAllValetTypes.invalidate(); setShowAdd(false); setForm({ name: "", valetCode: "", nominalCode: "", description: "", category: "VALET", departmentType: "ALL", defaultDurationMins: 60, sortOrder: 0 }); },
  });
  const update = trpc.valetLibrary.updateValetType.useMutation({
    onSuccess: () => { utils.valetLibrary.listAllValetTypes.invalidate(); setEditId(null); },
  });
  const remove = trpc.valetLibrary.deleteValetType.useMutation({
    onSuccess: () => utils.valetLibrary.listAllValetTypes.invalidate(),
  });

  const types = list.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-slate-900">Valet Type Library</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Define the master list of valet services available on the platform. Dealerships choose from this list when configuring their sites.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <PlusCircle className="h-4 w-4" /> Add type
        </button>
      </div>

      {showAdd && (
        <TypeForm
          form={form}
          onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
          onSave={() => create.mutate(form)}
          onCancel={() => setShowAdd(false)}
          saving={create.isPending}
          error={create.error?.message}
        />
      )}

      <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
        {list.isLoading ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : types.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">No valet types yet. Add your first type above.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Name</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Code</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Nominal</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Dept</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Category</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Duration</th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) =>
                editId === t.id && editForm ? (
                  <tr key={t.id} className="bg-slate-50">
                    <td className="px-4 py-2" colSpan={6}>
                      <TypeForm
                        form={editForm}
                        onChange={(k, v) => setEditForm((f) => f ? { ...f, [k]: v } : f)}
                        onSave={() => { const { id: _id, ...rest } = editForm!; update.mutate({ id: t.id, ...rest }); }}
                        onCancel={() => setEditId(null)}
                        saving={update.isPending}
                        inline
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${!t.isActive ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">{t.name}</td>
                    <td className="px-4 py-3">
                      {(t as { valetCode?: string | null }).valetCode ? (
                        <span className="font-mono text-xs font-bold text-slate-700">{(t as { valetCode?: string | null }).valetCode}</span>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {(t as { nominalCode?: string | null }).nominalCode ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${DEPT_COLORS[((t as { departmentType?: string }).departmentType ?? "ALL") as DeptType]}`}>
                        {DEPT_LABELS[((t as { departmentType?: string }).departmentType ?? "ALL") as DeptType]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[t.category as Category]}`}>
                        {CATEGORY_LABELS[t.category as Category] ?? t.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{t.defaultDurationMins} min</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{t.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold ${t.isActive ? "text-emerald-600" : "text-slate-400"}`}>
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => { setEditId(t.id); setEditForm({ id: t.id, name: t.name, valetCode: (t as { valetCode?: string | null }).valetCode ?? "", nominalCode: (t as { nominalCode?: string | null }).nominalCode ?? "", description: t.description ?? "", category: t.category as Category, departmentType: ((t as { departmentType?: string }).departmentType ?? "ALL") as DeptType, defaultDurationMins: t.defaultDurationMins, sortOrder: t.sortOrder }); }}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => remove.mutate({ id: t.id })}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function TypeForm({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  error,
  inline,
}: {
  form: { name: string; valetCode: string; nominalCode: string; description: string; category: Category; departmentType: DeptType; defaultDurationMins: number; sortOrder: number };
  onChange: (k: string, v: string | number | Category) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  error?: string;
  inline?: boolean;
}) {
  const wrapper = inline ? "" : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
  return (
    <div className={wrapper}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
          <input className={inputCls} value={form.name} onChange={(e) => onChange("name", e.target.value)} placeholder="e.g. Full Valet" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Valet Code</label>
          <input className={inputCls} style={{ width: 110 }} value={form.valetCode} onChange={(e) => onChange("valetCode", e.target.value.toUpperCase())} placeholder="e.g. FV01" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Nominal Code</label>
          <input className={inputCls} style={{ width: 110 }} value={form.nominalCode} onChange={(e) => onChange("nominalCode", e.target.value)} placeholder="e.g. 4001" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Department</label>
          <select className={inputCls} style={{ width: 130 }} value={form.departmentType} onChange={(e) => onChange("departmentType", e.target.value as DeptType)}>
            {(Object.entries(DEPT_LABELS) as [DeptType, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Category</label>
          <select className={inputCls} style={{ width: 140 }} value={form.category} onChange={(e) => onChange("category", e.target.value as Category)}>
            {(Object.entries(CATEGORY_LABELS) as [Category, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Duration (mins)</label>
          <input type="number" className={inputCls} style={{ width: 120 }} value={form.defaultDurationMins} min={1} max={600} onChange={(e) => onChange("defaultDurationMins", parseInt(e.target.value) || 60)} />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="mb-1 block text-xs font-medium text-slate-600">Description <span className="text-slate-400">(optional)</span></label>
          <input className={inputCls} value={form.description} onChange={(e) => onChange("description", e.target.value)} placeholder="Brief description…" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSave}
            disabled={saving || !form.name.trim()}
            className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onCancel} className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-500 hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Rate Templates Section ───────────────────────────────────────────────────

function RateTemplatesSection() {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingLine, setAddingLine] = useState<string | null>(null); // templateId
  const [lineForm, setLineForm] = useState({ serviceTypeName: "", basePricePence: 0, baseAllocMins: 60, pctSmall: -10, pctMedium: 0, pctLarge: 20, pctXL: 35, pctVan: 50 });

  const utils = trpc.useUtils();
  const valetTypes = trpc.valetLibrary.listValetTypes.useQuery();
  const list = trpc.valetLibrary.listAllRateTemplates.useQuery();
  const create = trpc.valetLibrary.createRateTemplate.useMutation({
    onSuccess: () => { utils.valetLibrary.listAllRateTemplates.invalidate(); setShowAdd(false); setNewName(""); setNewDesc(""); },
  });
  const upsertLine = trpc.valetLibrary.upsertRateTemplateLine.useMutation({
    onSuccess: () => { utils.valetLibrary.listAllRateTemplates.invalidate(); setAddingLine(null); },
  });
  const deleteLine = trpc.valetLibrary.deleteRateTemplateLine.useMutation({
    onSuccess: () => utils.valetLibrary.listAllRateTemplates.invalidate(),
  });
  const removeTemplate = trpc.valetLibrary.deleteRateTemplate.useMutation({
    onSuccess: () => utils.valetLibrary.listAllRateTemplates.invalidate(),
  });

  const templates = list.data ?? [];
  const availableTypes = valetTypes.data ?? [];

  const pence = (p: number) => `£${(p / 100).toFixed(2)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-slate-900">Rate Templates</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Create standard rate packages. Dealerships select a template to pre-fill their vehicle rates, then adjust if needed.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <PlusCircle className="h-4 w-4" /> New template
        </button>
      </div>

      {showAdd && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Template name</label>
              <input className={inputCls} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Standard Retail" />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600">Description <span className="text-slate-400">(optional)</span></label>
              <input className={inputCls} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Brief description…" />
            </div>
            <button
              onClick={() => create.mutate({ name: newName, description: newDesc || undefined })}
              disabled={!newName.trim() || create.isPending}
              className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
            <button onClick={() => setShowAdd(false)} className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-500 hover:bg-slate-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {list.isLoading && <p className="text-center text-sm text-slate-400 py-8">Loading…</p>}
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Template header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <button
                onClick={() => setExpandedId(expandedId === tmpl.id ? null : tmpl.id)}
                className="flex items-center gap-2 text-left"
              >
                {expandedId === tmpl.id ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
                <div>
                  <span className="font-bold text-slate-900">{tmpl.name}</span>
                  {tmpl.description && <span className="ml-2 text-sm text-slate-400">{tmpl.description}</span>}
                </div>
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                  {tmpl.lines.length} service{tmpl.lines.length !== 1 ? "s" : ""}
                </span>
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setAddingLine(tmpl.id)}
                  className="flex h-8 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Add line
                </button>
                <button
                  onClick={() => removeTemplate.mutate({ id: tmpl.id })}
                  className="h-8 rounded-lg px-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Power className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Add line form */}
            {addingLine === tmpl.id && (
              <div className="border-b border-slate-100 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Add service line</p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Service type</label>
                    <select
                      className="h-8 rounded border border-slate-200 bg-white px-2 text-xs"
                      value={lineForm.serviceTypeName}
                      onChange={(e) => setLineForm((f) => ({ ...f, serviceTypeName: e.target.value }))}
                    >
                      <option value="">Select…</option>
                      {availableTypes.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
                    </select>
                  </div>
                  {[
                    { key: "basePricePence", label: "Base price (£)", factor: 100 },
                  ].map(({ key, label, factor }) => (
                    <div key={key}>
                      <label className="mb-1 block text-xs text-slate-500">{label}</label>
                      <input
                        type="number"
                        className="h-8 w-24 rounded border border-slate-200 bg-white px-2 text-xs"
                        value={lineForm[key as keyof typeof lineForm] as number / (factor ?? 1)}
                        min={0}
                        step={0.01}
                        onChange={(e) => setLineForm((f) => ({ ...f, [key]: Math.round(parseFloat(e.target.value) * (factor ?? 1)) || 0 }))}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="mb-1 block text-xs text-slate-500">Alloc (mins)</label>
                    <input type="number" className="h-8 w-20 rounded border border-slate-200 bg-white px-2 text-xs" value={lineForm.baseAllocMins} min={1} onChange={(e) => setLineForm((f) => ({ ...f, baseAllocMins: parseInt(e.target.value) || 60 }))} />
                  </div>
                  {(["pctSmall", "pctMedium", "pctLarge", "pctXL", "pctVan"] as const).map((k) => (
                    <div key={k}>
                      <label className="mb-1 block text-xs text-slate-500">{k.replace("pct", "")} %</label>
                      <input type="number" className="h-8 w-16 rounded border border-slate-200 bg-white px-2 text-xs" value={lineForm[k]} onChange={(e) => setLineForm((f) => ({ ...f, [k]: parseInt(e.target.value) || 0 }))} />
                    </div>
                  ))}
                  <button
                    onClick={() => upsertLine.mutate({ templateId: tmpl.id, ...lineForm })}
                    disabled={!lineForm.serviceTypeName || upsertLine.isPending}
                    className="h-8 rounded bg-slate-900 px-3 text-xs font-semibold text-white disabled:opacity-50"
                  >
                    {upsertLine.isPending ? "…" : "Save"}
                  </button>
                  <button onClick={() => setAddingLine(null)} className="h-8 rounded border border-slate-200 px-2 text-xs text-slate-500 hover:bg-white">Cancel</button>
                </div>
              </div>
            )}

            {/* Lines table */}
            {(expandedId === tmpl.id || addingLine === tmpl.id) && tmpl.lines.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      {["Service Type", "Base Price", "Alloc", "Small %", "Medium %", "Large %", "XL %", "Van %", ""].map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-slate-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tmpl.lines.map((l) => (
                      <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-medium text-slate-800">{l.serviceTypeName}</td>
                        <td className="px-3 py-2 text-slate-600">{pence(l.basePricePence)}</td>
                        <td className="px-3 py-2 text-slate-600">{l.baseAllocMins}m</td>
                        <td className="px-3 py-2 text-slate-500">{l.pctSmall}%</td>
                        <td className="px-3 py-2 text-slate-500">{l.pctMedium}%</td>
                        <td className="px-3 py-2 text-slate-500">{l.pctLarge}%</td>
                        <td className="px-3 py-2 text-slate-500">{l.pctXL}%</td>
                        <td className="px-3 py-2 text-slate-500">{l.pctVan}%</td>
                        <td className="px-3 py-2">
                          <button onClick={() => deleteLine.mutate({ id: l.id })} className="text-slate-300 hover:text-red-500">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
        {!list.isLoading && templates.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
            No rate templates yet. Create your first template above.
          </p>
        )}
      </div>
    </div>
  );
}
