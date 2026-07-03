"use client";

import { useState } from "react";
import {
  UserPlus, Search, ChevronDown, Trash2, Pencil, X, Check, Loader2, Phone, Mail, MapPin, StickyNote,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── types ───────────────────────────────────────────────────────────────────
type ProspectStatus = "NEW" | "CONTACTED" | "INTERVIEWED" | "OFFERED" | "ONBOARDED" | "DECLINED";

const STATUS_CONFIG: Record<ProspectStatus, { label: string; cls: string }> = {
  NEW:         { label: "New",         cls: "bg-slate-100 text-slate-600" },
  CONTACTED:   { label: "Contacted",   cls: "bg-blue-100 text-blue-700" },
  INTERVIEWED: { label: "Interviewed", cls: "bg-purple-100 text-purple-700" },
  OFFERED:     { label: "Offered",     cls: "bg-amber-100 text-amber-700" },
  ONBOARDED:   { label: "Onboarded",   cls: "bg-emerald-100 text-emerald-700" },
  DECLINED:    { label: "Declined",    cls: "bg-red-100 text-red-500" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as ProspectStatus[];

const FILTER_TABS: { key: ProspectStatus | "ALL"; label: string }[] = [
  { key: "ALL",         label: "All" },
  { key: "NEW",         label: "New" },
  { key: "CONTACTED",   label: "Contacted" },
  { key: "INTERVIEWED", label: "Interviewed" },
  { key: "OFFERED",     label: "Offered" },
  { key: "ONBOARDED",   label: "Onboarded" },
  { key: "DECLINED",    label: "Declined" },
];

// ─── Add / Edit form ─────────────────────────────────────────────────────────
type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
  siteId: string;
};

const EMPTY_FORM: FormState = {
  firstName: "", lastName: "", email: "", phone: "", notes: "", siteId: "",
};

interface ProspectsClientProps {
  sites: { id: string; name: string }[];
}

export function ProspectsClient({ sites }: ProspectsClientProps) {
  const [tab, setTab]       = useState<ProspectStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [editId, setEditId]         = useState<string | null>(null);
  const [form, setForm]             = useState<FormState>(EMPTY_FORM);
  const [editStatus, setEditStatus] = useState<ProspectStatus>("NEW");
  const [deleteId, setDeleteId]     = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: counts }   = trpc.prospects.statusCounts.useQuery();
  const { data: prospects, isLoading } = trpc.prospects.list.useQuery({
    status: tab === "ALL" ? undefined : tab,
    search: search.trim() || undefined,
  });

  const create = trpc.prospects.create.useMutation({
    onSuccess: () => {
      void utils.prospects.list.invalidate();
      void utils.prospects.statusCounts.invalidate();
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const update = trpc.prospects.update.useMutation({
    onSuccess: () => {
      void utils.prospects.list.invalidate();
      void utils.prospects.statusCounts.invalidate();
      setEditId(null);
    },
  });

  const remove = trpc.prospects.remove.useMutation({
    onSuccess: () => {
      void utils.prospects.list.invalidate();
      void utils.prospects.statusCounts.invalidate();
      setDeleteId(null);
    },
  });

  function openEdit(p: NonNullable<typeof prospects>[number]) {
    setEditId(p.id);
    setForm({
      firstName: p.firstName,
      lastName:  p.lastName,
      email:     p.email  ?? "",
      phone:     p.phone  ?? "",
      notes:     p.notes  ?? "",
      siteId:    p.siteId ?? "",
    });
    setEditStatus(p.status as ProspectStatus);
  }

  const rows = prospects ?? [];

  return (
    <div className="space-y-5">

      {/* Stat chips */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setTab(s)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
              tab === s ? "border-transparent bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            <span className={cn("inline-block h-1.5 w-1.5 rounded-full", STATUS_CONFIG[s].cls.split(" ")[0])} />
            {STATUS_CONFIG[s].label}
            <span className="tabular-nums opacity-70">{counts?.[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email or phone…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-slate-400"
          />
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setForm(EMPTY_FORM); }}
          className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <UserPlus className="h-4 w-4" />
          Add Prospect
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">New Prospect Valeter</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              placeholder="First name *" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              placeholder="Last name *" className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email address" type="email"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone number"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
            <select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-slate-400">
              <option value="">Site (optional)</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes (optional)" rows={2}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 sm:col-span-2" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="button"
              disabled={!form.firstName.trim() || !form.lastName.trim() || create.isPending}
              onClick={() => create.mutate({ ...form, siteId: form.siteId || undefined, email: form.email || undefined, phone: form.phone || undefined, notes: form.notes || undefined })}
              className="inline-flex items-center gap-2 rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save Prospect
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <UserPlus className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-400">No prospects yet. Add one above.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Contact</th>
                <th className="px-5 py-3 text-left">Site</th>
                <th className="px-5 py-3 text-left">Notes</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const isEditing = editId === p.id;
                const cfg = STATUS_CONFIG[p.status as ProspectStatus] ?? STATUS_CONFIG.NEW;

                if (isEditing) {
                  return (
                    <tr key={p.id} className="border-b border-slate-100 bg-slate-50">
                      <td className="px-5 py-3" colSpan={6}>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                            placeholder="First name" className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
                          <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                            placeholder="Last name" className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
                          <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as ProspectStatus)}
                            className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400">
                            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                          </select>
                          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="Email" className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
                          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="Phone" className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
                          <select value={form.siteId} onChange={(e) => setForm({ ...form, siteId: e.target.value })}
                            className="h-9 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400">
                            <option value="">No site</option>
                            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            placeholder="Notes" rows={2}
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 sm:col-span-3" />
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <button type="button" onClick={() => setEditId(null)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            Cancel
                          </button>
                          <button type="button"
                            disabled={update.isPending}
                            onClick={() => update.mutate({ id: p.id, ...form, status: editStatus, siteId: form.siteId || null, email: form.email || undefined })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50">
                            {update.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                            Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-medium text-slate-900">
                      {p.firstName} {p.lastName}
                    </td>
                    <td className="px-5 py-3">
                      <div className="space-y-0.5 text-xs text-slate-500">
                        {p.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 shrink-0" />
                            <a href={`mailto:${p.email}`} className="hover:text-navy hover:underline">{p.email}</a>
                          </div>
                        )}
                        {p.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            <a href={`tel:${p.phone}`} className="hover:text-navy hover:underline">{p.phone}</a>
                          </div>
                        )}
                        {!p.email && !p.phone && <span className="text-slate-300">—</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {p.siteName ? (
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.siteName}</span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="max-w-[200px] px-5 py-3 text-xs text-slate-500">
                      {p.notes ? (
                        <span className="flex items-start gap-1.5 line-clamp-2">
                          <StickyNote className="mt-0.5 h-3 w-3 shrink-0" />
                          {p.notes}
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", cfg.cls)}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => openEdit(p)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setDeleteId(p.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-bold text-slate-900">Remove prospect?</h3>
            <p className="mb-5 text-sm text-slate-500">This prospect will be permanently removed. This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button"
                onClick={() => remove.mutate({ id: deleteId })}
                disabled={remove.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
