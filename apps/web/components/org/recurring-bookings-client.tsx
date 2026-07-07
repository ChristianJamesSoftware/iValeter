"use client";

import { useState, useMemo } from "react";
import {
  Plus, Trash2, Pencil, CheckCircle2, AlertTriangle, Clock,
  Pause, RefreshCw, ChevronDown, ChevronUp, X, Camera,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Frequency = "DAILY" | "SPECIFIC_DAYS" | "EVERY_OTHER_DAY" | "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
const FREQ_LABELS: Record<Frequency, string> = {
  DAILY: "Every day (Mon–Fri)",
  SPECIFIC_DAYS: "Specific days",
  EVERY_OTHER_DAY: "Every other day",
  WEEKLY: "Weekly",
  FORTNIGHTLY: "Fortnightly",
  MONTHLY: "Monthly",
};
const FREQ_OPTIONS = Object.entries(FREQ_LABELS) as [Frequency, string][];
const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

const TIME_SLOTS: string[] = (() => {
  const s: string[] = [];
  for (let h = 7; h <= 18; h++)
    for (const m of [0, 15, 30, 45])
      s.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  return s;
})();

type OccStatus = "PENDING" | "CLAIMED" | "COMPLETED" | "MISSED";

const STATUS_CONFIG: Record<OccStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  PENDING:   { label: "Pending",   bg: "bg-amber-100",   text: "text-amber-700",   icon: Clock },
  CLAIMED:   { label: "In Progress", bg: "bg-blue-100",  text: "text-blue-700",    icon: RefreshCw },
  COMPLETED: { label: "Done",      bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
  MISSED:    { label: "Missed",    bg: "bg-red-100",     text: "text-red-700",     icon: AlertTriangle },
};

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

const inputCls = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

// ─── Template form (create / edit) ───────────────────────────────────────────

type TemplateFormData = {
  siteId: string;
  name: string;
  description: string;
  frequency: Frequency;
  customDays: string[];
  mustDoneByTime: string;
  estimatedMins: string; // stored as string in form, parsed to int on save
  assignedToId: string;
  auditQuestions: string[];
};

const BLANK_FORM: TemplateFormData = {
  siteId: "", name: "", description: "", frequency: "DAILY",
  customDays: ["MON","TUE","WED","THU","FRI"],
  mustDoneByTime: "09:00", estimatedMins: "", assignedToId: "", auditQuestions: [""],
};

function TemplateForm({
  initial,
  sites,
  valeters,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: TemplateFormData;
  sites: { id: string; name: string }[];
  valeters: { id: string; firstName: string; lastName: string }[];
  onSave: (data: TemplateFormData) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<TemplateFormData>(initial);
  const set = <K extends keyof TemplateFormData>(k: K, v: TemplateFormData[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const toggleDay = (day: string) =>
    set("customDays", form.customDays.includes(day)
      ? form.customDays.filter((d) => d !== day)
      : [...form.customDays, day]);

  const setQuestion = (i: number, v: string) => {
    const q = [...form.auditQuestions];
    q[i] = v;
    set("auditQuestions", q);
  };

  const addQuestion = () => set("auditQuestions", [...form.auditQuestions, ""]);
  const removeQuestion = (i: number) =>
    set("auditQuestions", form.auditQuestions.filter((_, idx) => idx !== i));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = {
      ...form,
      auditQuestions: form.auditQuestions.filter((q) => q.trim().length > 0),
    };
    onSave(cleaned);
  }

  return (
    <form onSubmit={submit} className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 p-5">
      <p className="mb-4 text-sm font-bold text-slate-900">
        {initial.name ? `Edit: ${initial.name}` : "New Recurring Job"}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Site */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Site</label>
          <select value={form.siteId} onChange={(e) => set("siteId", e.target.value)} required className={inputCls}>
            <option value="">Select site…</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        {/* Name */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Job Name</label>
          <input
            value={form.name} onChange={(e) => set("name", e.target.value)}
            required placeholder="e.g. Daily Showroom Walk"
            className={inputCls}
          />
        </div>

        {/* Frequency */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Frequency</label>
          <select value={form.frequency} onChange={(e) => set("frequency", e.target.value as Frequency)} className={inputCls}>
            {FREQ_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Custom days (only when SPECIFIC_DAYS) */}
        {form.frequency === "SPECIFIC_DAYS" && (
          <div className="sm:col-span-2 lg:col-span-3">
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Select days</label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map((d) => (
                <button
                  key={d} type="button"
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-bold transition",
                    form.customDays.includes(d)
                      ? "border-orange-500 bg-orange-500 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-orange-300",
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Must done by */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Must Be Done By</label>
          <select value={form.mustDoneByTime} onChange={(e) => set("mustDoneByTime", e.target.value)} className={inputCls}>
            {TIME_SLOTS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Estimated time */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estimated Time <span className="normal-case font-normal text-slate-400">(minutes)</span>
          </label>
          <select
            value={form.estimatedMins}
            onChange={(e) => set("estimatedMins", e.target.value)}
            className={inputCls}
          >
            <option value="">Not set</option>
            {[10,15,20,30,45,60,90,120,150,180,240,300,360,420,480].map((m) => (
              <option key={m} value={String(m)}>
                {m < 60 ? `${m} min` : m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m/60)}h ${m%60}min`}
              </option>
            ))}
          </select>
        </div>

        {/* Assign to valeter (optional) */}
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assigned Valeter <span className="normal-case font-normal text-slate-400">(leave blank = any can claim)</span>
          </label>
          <select value={form.assignedToId} onChange={(e) => set("assignedToId", e.target.value)} className={inputCls}>
            <option value="">Any valeter</option>
            {valeters.map((v) => (
              <option key={v.id} value={v.id}>{v.firstName} {v.lastName}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Description / Instructions <span className="normal-case font-normal text-slate-400">(shown on valeter card)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="e.g. Walk showroom floor, check all display vehicles are clean and presentable…"
            rows={2}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {/* Audit questions */}
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Completion Checklist <span className="normal-case font-normal text-slate-400">(valeter answers Yes/No before signing off)</span>
          </label>
          <div className="space-y-2">
            {form.auditQuestions.map((q, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={q}
                  onChange={(e) => setQuestion(i, e.target.value)}
                  placeholder={`e.g. ${i === 0 ? "Showroom floor clean?" : i === 1 ? "Tyres shined on all display cars?" : "Windows polished?"}`}
                  className={cn(inputCls, "flex-1")}
                />
                {form.auditQuestions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(i)}
                    className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-red-300 hover:text-red-500">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button" onClick={addQuestion}
              className="flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add question
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-white">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Today's occurrences panel ────────────────────────────────────────────────

function TodayPanel({ siteFilter }: { siteFilter: string }) {
  const { data: occs, isLoading, refetch } = trpc.recurringJobs.todayOccurrences.useQuery(
    { siteId: siteFilter || undefined },
    { refetchInterval: 60_000 },
  );
  const utils = trpc.useUtils();
  const markMissed = trpc.recurringJobs.markMissed.useMutation({
    onSuccess: () => void utils.recurringJobs.todayOccurrences.invalidate(),
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const overdue = (occs ?? []).filter(
    (o) => o.status === "PENDING" || o.status === "CLAIMED",
  ).filter((o) => {
    const [h, m] = o.template.mustDoneByTime.split(":").map(Number);
    const deadline = new Date();
    deadline.setHours(h ?? 17, m ?? 0, 0, 0);
    return new Date() > deadline;
  });

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          <h2 className="text-base font-bold text-slate-900">Today's Jobs</h2>
          {overdue.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-black text-white">
              {overdue.length} overdue
            </span>
          )}
        </div>
        <button onClick={() => refetch()} className="rounded-lg border border-slate-100 p-1.5 text-slate-400 hover:text-slate-700">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {isLoading ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : !occs || occs.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-400">No recurring jobs scheduled for today</p>
      ) : (
        <div className="divide-y divide-slate-50">
          {occs.map((occ) => {
            const cfg = STATUS_CONFIG[occ.status as OccStatus];
            const Icon = cfg.icon;
            const isExpanded = expanded === occ.id;
            return (
              <div key={occ.id} className={cn(occ.status === "MISSED" && "bg-red-50/30")}>
                <button
                  onClick={() => setExpanded(isExpanded ? null : occ.id)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-slate-50/50"
                >
                  <div className="flex items-center gap-3">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold", cfg.bg, cfg.text)}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{occ.template.name}</p>
                      <p className="text-xs text-slate-400">
                        {occ.template.site.name} · Done by {occ.template.mustDoneByTime}
                        {occ.claimedBy && ` · ${occ.claimedBy.firstName} ${occ.claimedBy.lastName}`}
                      </p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-50 px-5 pb-4 pt-3">
                    {/* Audit answers */}
                    {occ.auditAnswers.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Checklist</p>
                        <div className="space-y-1">
                          {occ.auditAnswers.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 text-xs">
                              {a.answer
                                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                : <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                              <span className={a.answer ? "text-slate-700" : "font-semibold text-red-700"}>{a.question}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Photo */}
                    {occ.photoUrl && (
                      <a href={occ.photoUrl} target="_blank" rel="noopener noreferrer"
                        className="mb-3 flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                        <Camera className="h-3.5 w-3.5" /> View photo evidence
                      </a>
                    )}

                    {/* Completion note */}
                    {occ.completionNote && (
                      <p className="mb-3 text-xs text-slate-600 italic">"{occ.completionNote}"</p>
                    )}

                    {/* Mark missed manually */}
                    {(occ.status === "PENDING" || occ.status === "CLAIMED") && (
                      <button
                        onClick={() => markMissed.mutate({ occurrenceId: occ.id })}
                        disabled={markMissed.isPending}
                        className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" /> Mark Missed
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Templates table ──────────────────────────────────────────────────────────

function TemplatesTable({
  siteFilter,
  sites,
  valeters,
}: {
  siteFilter: string;
  sites: { id: string; name: string }[];
  valeters: { id: string; firstName: string; lastName: string }[];
}) {
  const utils = trpc.useUtils();
  const { data: templates, isLoading } = trpc.recurringJobs.listTemplates.useQuery(
    { siteId: siteFilter || undefined },
  );
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const createMutation = trpc.recurringJobs.createTemplate.useMutation({
    onSuccess: () => { void utils.recurringJobs.listTemplates.invalidate(); setShowForm(false); },
  });
  const updateMutation = trpc.recurringJobs.updateTemplate.useMutation({
    onSuccess: () => { void utils.recurringJobs.listTemplates.invalidate(); setEditingId(null); },
  });
  const deleteMutation = trpc.recurringJobs.deleteTemplate.useMutation({
    onSuccess: () => void utils.recurringJobs.listTemplates.invalidate(),
  });
  const toggleMutation = trpc.recurringJobs.updateTemplate.useMutation({
    onSuccess: () => void utils.recurringJobs.listTemplates.invalidate(),
  });

  const editingTemplate = templates?.find((t) => t.id === editingId);
  const editingForm: TemplateFormData | null = editingTemplate
    ? {
        siteId: editingTemplate.siteId,
        name: editingTemplate.name,
        description: editingTemplate.description ?? "",
        frequency: editingTemplate.frequency as Frequency,
        customDays: (editingTemplate.customDays as string[] | null) ?? [],
        mustDoneByTime: editingTemplate.mustDoneByTime,
        estimatedMins: editingTemplate.estimatedMins ? String(editingTemplate.estimatedMins) : "",
        assignedToId: editingTemplate.assignedToId ?? "",
        auditQuestions: (editingTemplate.auditQuestions as string[] | null) ?? [""],
      }
    : null;

  function handleCreate(data: TemplateFormData) {
    const qs = data.auditQuestions.filter((q) => q.trim());
    createMutation.mutate({
      siteId: data.siteId,
      name: data.name,
      description: data.description || undefined,
      frequency: data.frequency,
      customDays: data.frequency === "SPECIFIC_DAYS"
        ? (data.customDays as ("MON"|"TUE"|"WED"|"THU"|"FRI"|"SAT"|"SUN")[])
        : undefined,
      mustDoneByTime: data.mustDoneByTime,
      estimatedMins: data.estimatedMins ? parseInt(data.estimatedMins, 10) : undefined,
      assignedToId: data.assignedToId || undefined,
      auditQuestions: qs.length > 0 ? qs : undefined,
    });
  }

  function handleUpdate(data: TemplateFormData) {
    if (!editingId) return;
    const qs = data.auditQuestions.filter((q) => q.trim());
    updateMutation.mutate({
      id: editingId,
      name: data.name,
      description: data.description || undefined,
      frequency: data.frequency,
      customDays: data.frequency === "SPECIFIC_DAYS"
        ? (data.customDays as ("MON"|"TUE"|"WED"|"THU"|"FRI"|"SAT"|"SUN")[])
        : undefined,
      mustDoneByTime: data.mustDoneByTime,
      estimatedMins: data.estimatedMins ? parseInt(data.estimatedMins, 10) : null,
      assignedToId: data.assignedToId || null,
      auditQuestions: qs.length > 0 ? qs : undefined,
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Job Templates</h2>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); }}
          className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          <Plus className="h-4 w-4" /> Add Job
        </button>
      </div>

      {showForm && (
        <TemplateForm
          initial={BLANK_FORM}
          sites={sites}
          valeters={valeters}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
          isSaving={createMutation.isPending}
        />
      )}

      {editingId && editingForm && (
        <TemplateForm
          initial={editingForm}
          sites={sites}
          valeters={valeters}
          onSave={handleUpdate}
          onCancel={() => setEditingId(null)}
          isSaving={updateMutation.isPending}
        />
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
      ) : !templates || templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-sm text-slate-400">No recurring jobs yet</p>
          <p className="mt-1 text-xs text-slate-300">Add your first job above — it will appear on the valeter app every day it's scheduled</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                {["Job", "Site", "Frequency", "Done By", "Est. Time", "Assigned To", "Checklist", "Status", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const qs = (t.auditQuestions as string[] | null) ?? [];
                return (
                  <tr key={t.id} className={cn("border-b border-slate-50 last:border-0", !t.isActive && "opacity-50")}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{t.name}</p>
                      {t.description && <p className="mt-0.5 truncate text-xs text-slate-400 max-w-[200px]">{t.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{t.site.name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <span>{FREQ_LABELS[t.frequency as Frequency]}</span>
                      {t.frequency === "SPECIFIC_DAYS" && (
                        <p className="text-[11px] text-slate-400">{((t.customDays as string[] | null) ?? []).join(", ")}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{t.mustDoneByTime}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {t.estimatedMins
                        ? t.estimatedMins < 60
                          ? `${t.estimatedMins}m`
                          : t.estimatedMins % 60 === 0
                            ? `${t.estimatedMins / 60}h`
                            : `${Math.floor(t.estimatedMins / 60)}h ${t.estimatedMins % 60}m`
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : <span className="text-slate-300">Any</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {qs.length > 0 ? `${qs.length} question${qs.length > 1 ? "s" : ""}` : <span className="text-slate-300">None</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                        t.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500",
                      )}>
                        {t.isActive ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setEditingId(t.id)}
                          className="rounded-lg border border-slate-100 p-1.5 text-slate-400 hover:border-slate-300 hover:text-slate-700"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleMutation.mutate({ id: t.id, isActive: !t.isActive })}
                          disabled={toggleMutation.isPending}
                          className="rounded-lg border border-slate-100 p-1.5 text-slate-400 hover:border-slate-300 hover:text-slate-700"
                          title={t.isActive ? "Pause" : "Resume"}
                        >
                          <Pause className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMutation.mutate({ id: t.id }); }}
                          disabled={deleteMutation.isPending}
                          className="rounded-lg border border-slate-100 p-1.5 text-slate-400 hover:border-red-200 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────

export function RecurringBookingsClient() {
  const [siteFilter, setSiteFilter] = useState("");
  const { data: sites } = trpc.sites.list.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery();

  const valeters = useMemo(
    () => (allUsers ?? []).filter((u) => u.role === "valeter"),
    [allUsers],
  );

  const siteOpts = sites ?? [];
  const overdueCount = 0; // shown inside TodayPanel

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Recurring Bookings"
        subtitle="Set up jobs that appear every day on the valeter app — showroom walks, pitch checks, prep tasks."
      />

      {/* Site filter */}
      {siteOpts.length > 1 && (
        <div className="mb-5">
          <select
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-orange-400"
          >
            <option value="">All sites</option>
            {siteOpts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* Today's live status */}
      <TodayPanel siteFilter={siteFilter} />

      {/* Template management */}
      <TemplatesTable siteFilter={siteFilter} sites={siteOpts} valeters={valeters} />
    </div>
  );
}
