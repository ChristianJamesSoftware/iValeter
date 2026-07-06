"use client";

/**
 * OpportunitiesClient
 * ────────────────────
 * Full rebuild for the Opportunities section.
 *
 * Features:
 *  - Prospect cards with expandable detail (experience, employment history, licence, pay, position)
 *  - Full edit drawer with all extended fields
 *  - Pipeline status filter tabs with counts
 *  - Town / area filter dropdown
 *  - Import existing valeters button
 *  - Area broadcast panel (filter by town + status, write subject + body, send)
 *  - Broadcast history log
 */

import { useState, useEffect } from "react";
import {
  UserPlus, Search, Trash2, Pencil, X, Check, Loader2, Phone, Mail,
  MapPin, StickyNote, ChevronDown, ChevronUp, Megaphone, History,
  Car, ShieldCheck, Banknote, Briefcase, BookOpen, Users, Send,
  ArrowDownToLine, CheckCircle2, Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProspectStatus = "NEW" | "CONTACTED" | "INTERVIEWED" | "OFFERED" | "ONBOARDED" | "DECLINED";

const STATUS_CONFIG: Record<ProspectStatus, { label: string; pill: string; dot: string }> = {
  NEW:         { label: "New",         pill: "bg-slate-100 text-slate-600",    dot: "bg-slate-400" },
  CONTACTED:   { label: "Contacted",   pill: "bg-blue-100 text-blue-700",      dot: "bg-blue-500" },
  INTERVIEWED: { label: "Interviewed", pill: "bg-purple-100 text-purple-700",  dot: "bg-purple-500" },
  OFFERED:     { label: "Offered",     pill: "bg-amber-100 text-amber-700",    dot: "bg-amber-500" },
  ONBOARDED:   { label: "Onboarded",   pill: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500" },
  DECLINED:    { label: "Declined",    pill: "bg-red-100 text-red-500",        dot: "bg-red-400" },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as ProspectStatus[];

type ProspectRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  town: string | null;
  experience: string | null;
  employmentHistory: string | null;
  ukLicence: boolean | null;
  drives: boolean | null;
  position: string | null;
  payRequirementMin: number | null;
  payRequirementMax: number | null;
  source: string | null;
  notes: string | null;
  status: string;
  siteId: string | null;
  site: { id: string; name: string } | null;
  convertedToUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// ─── Form state ───────────────────────────────────────────────────────────────

type FormState = {
  firstName: string; lastName: string;
  email: string; phone: string; town: string;
  experience: string; employmentHistory: string;
  ukLicence: boolean | null; drives: boolean | null;
  position: string;
  payRequirementMin: string; payRequirementMax: string;
  source: string; notes: string; siteId: string;
  status: ProspectStatus;
};

const EMPTY_FORM: FormState = {
  firstName: "", lastName: "", email: "", phone: "", town: "",
  experience: "", employmentHistory: "",
  ukLicence: null, drives: null,
  position: "", payRequirementMin: "", payRequirementMax: "",
  source: "", notes: "", siteId: "", status: "NEW",
};

function prospectToForm(p: ProspectRow): FormState {
  return {
    firstName:         p.firstName,
    lastName:          p.lastName,
    email:             p.email             ?? "",
    phone:             p.phone             ?? "",
    town:              p.town              ?? "",
    experience:        p.experience        ?? "",
    employmentHistory: p.employmentHistory ?? "",
    ukLicence:         p.ukLicence         ?? null,
    drives:            p.drives            ?? null,
    position:          p.position          ?? "",
    payRequirementMin: p.payRequirementMin != null ? String(Math.round(p.payRequirementMin / 100)) : "",
    payRequirementMax: p.payRequirementMax != null ? String(Math.round(p.payRequirementMax / 100)) : "",
    source:            p.source            ?? "",
    notes:             p.notes             ?? "",
    siteId:            p.siteId            ?? "",
    status:            p.status as ProspectStatus,
  };
}

function formToApi(f: FormState) {
  return {
    firstName:         f.firstName,
    lastName:          f.lastName,
    email:             f.email       || undefined,
    phone:             f.phone       || undefined,
    town:              f.town        || undefined,
    experience:        f.experience  || undefined,
    employmentHistory: f.employmentHistory || undefined,
    ukLicence:         f.ukLicence,
    drives:            f.drives,
    position:          f.position    || undefined,
    payRequirementMin: f.payRequirementMin ? Math.round(parseFloat(f.payRequirementMin) * 100) : null,
    payRequirementMax: f.payRequirementMax ? Math.round(parseFloat(f.payRequirementMax) * 100) : null,
    source:            f.source      || undefined,
    notes:             f.notes       || undefined,
    siteId:            f.siteId      || null,
    status:            f.status,
  };
}

// ─── TriToggle (Yes / No / Unknown) ──────────────────────────────────────────

function TriToggle({
  label, value, onChange,
}: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-slate-500">{label}</p>
      <div className="flex gap-1">
        {([true, false, null] as const).map((v) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
              value === v
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-400",
            )}
          >
            {v === true ? "Yes" : v === false ? "No" : "Unknown"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Prospect form (used in both Add and Edit drawer) ────────────────────────

function ProspectForm({
  form, setForm, sites,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  sites: { id: string; name: string }[];
}) {
  const f = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-5">
      {/* Core contact */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Contact Details</p>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.firstName} onChange={f("firstName")} placeholder="First name *"
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
          <input value={form.lastName} onChange={f("lastName")} placeholder="Last name *"
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
          <input value={form.email} onChange={f("email")} placeholder="Email address" type="email"
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 col-span-2" />
          <input value={form.phone} onChange={f("phone")} placeholder="Mobile number"
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
          <input value={form.town} onChange={f("town")} placeholder="Town or area"
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
        </div>
      </div>

      {/* Pipeline */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Pipeline</p>
        <div className="grid grid-cols-2 gap-3">
          <select value={form.status} onChange={f("status")}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-slate-400">
            {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
          <select value={form.siteId} onChange={f("siteId")}
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-slate-400">
            <option value="">Site (optional)</option>
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input value={form.source} onChange={f("source")} placeholder="Source (e.g. Referral, Walk-in)"
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 col-span-2" />
        </div>
      </div>

      {/* Suitability */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Suitability</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <TriToggle label="UK Driving Licence" value={form.ukLicence} onChange={(v) => setForm({ ...form, ukLicence: v })} />
          <TriToggle label="Willing to Drive on Site" value={form.drives} onChange={(v) => setForm({ ...form, drives: v })} />
        </div>
        <input value={form.position} onChange={f("position")} placeholder="Position interested in (e.g. Valeter, Team Leader)"
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Min pay expectation (£/day)</label>
            <input value={form.payRequirementMin} onChange={f("payRequirementMin")} placeholder="e.g. 100" type="number" min="0"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Max pay expectation (£/day)</label>
            <input value={form.payRequirementMax} onChange={f("payRequirementMax")} placeholder="e.g. 130" type="number" min="0"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400" />
          </div>
        </div>
      </div>

      {/* Experience */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Experience</p>
        <textarea value={form.experience} onChange={f("experience")}
          placeholder="Current / recent valeting experience…" rows={3}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400 mb-3" />
        <p className="mb-1 text-xs font-semibold text-slate-500">Employment History</p>
        <textarea value={form.employmentHistory} onChange={f("employmentHistory")}
          placeholder="Previous employers, roles, dates…" rows={4}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
      </div>

      {/* Notes */}
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes</p>
        <textarea value={form.notes} onChange={f("notes")} placeholder="General notes…" rows={2}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
      </div>
    </div>
  );
}

// ─── Prospect card ────────────────────────────────────────────────────────────

function ProspectCard({
  prospect, sites, onEdit, onDelete,
}: {
  prospect: ProspectRow;
  sites: { id: string; name: string }[];
  onEdit: (p: ProspectRow) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[prospect.status as ProspectStatus] ?? STATUS_CONFIG.NEW;
  const isOnboarded = prospect.status === "ONBOARDED";

  const payLabel = (() => {
    const mn = prospect.payRequirementMin;
    const mx = prospect.payRequirementMax;
    if (!mn && !mx) return null;
    if (mn && mx) return `£${Math.round(mn/100)}–£${Math.round(mx/100)}/day`;
    if (mn) return `£${Math.round(mn/100)}+ /day`;
    return `Up to £${Math.round((mx ?? 0)/100)}/day`;
  })();

  return (
    <div className={cn(
      "rounded-xl border bg-white shadow-sm overflow-hidden transition-all",
      isOnboarded ? "border-emerald-100" : "border-slate-100",
    )}>
      {/* Card header row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Avatar */}
        <div className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold",
          isOnboarded ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600",
        )}>
          {prospect.firstName[0]}{prospect.lastName[0]}
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900 text-sm">
              {prospect.firstName} {prospect.lastName}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", cfg.pill)}>
              {cfg.label}
            </span>
            {prospect.convertedToUserId && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 border border-emerald-100">
                Active Valeter
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
            {prospect.town && (
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{prospect.town}</span>
            )}
            {prospect.email && (
              <a href={`mailto:${prospect.email}`} className="flex items-center gap-1 hover:text-slate-900">
                <Mail className="h-3 w-3" />{prospect.email}
              </a>
            )}
            {prospect.phone && (
              <a href={`tel:${prospect.phone}`} className="flex items-center gap-1 hover:text-slate-900">
                <Phone className="h-3 w-3" />{prospect.phone}
              </a>
            )}
            {prospect.position && (
              <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{prospect.position}</span>
            )}
            {payLabel && (
              <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />{payLabel}</span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => onEdit(prospect)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(prospect.id)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <DetailRow icon={ShieldCheck} label="UK Licence" value={
              prospect.ukLicence === true ? "Yes" : prospect.ukLicence === false ? "No" : "Unknown"
            } />
            <DetailRow icon={Car} label="Drives on site" value={
              prospect.drives === true ? "Yes" : prospect.drives === false ? "No" : "Unknown"
            } />
            {prospect.site && <DetailRow icon={MapPin} label="Preferred site" value={prospect.site.name} />}
            {prospect.source && <DetailRow icon={Users} label="Source" value={prospect.source} />}
          </div>

          {prospect.experience && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Experience
              </p>
              <p className="text-xs text-slate-700 whitespace-pre-line">{prospect.experience}</p>
            </div>
          )}

          {prospect.employmentHistory && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <BookOpen className="h-3 w-3" /> Employment History
              </p>
              <p className="text-xs text-slate-700 whitespace-pre-line">{prospect.employmentHistory}</p>
            </div>
          )}

          {prospect.notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                <StickyNote className="h-3 w-3" /> Notes
              </p>
              <p className="text-xs text-slate-700 whitespace-pre-line">{prospect.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3 w-3 text-slate-400 shrink-0" />
      <span className="text-slate-500">{label}:</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

// ─── Broadcast panel ─────────────────────────────────────────────────────────

function BroadcastPanel({ towns }: { towns: string[] }) {
  const [subject, setSubject]       = useState("");
  const [message, setMessage]       = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>(["NEW", "CONTACTED"]);
  const [showHistory, setShowHistory] = useState(false);

  const utils = trpc.useUtils();
  const { data: broadcasts } = trpc.prospects.listBroadcasts.useQuery(undefined, { enabled: showHistory });

  const send = trpc.prospects.broadcast.useMutation({
    onSuccess: (data) => {
      setSubject("");
      setMessage("");
      void utils.prospects.listBroadcasts.invalidate();
      alert(`Broadcast logged — ${data.recipientCount} recipient${data.recipientCount !== 1 ? "s" : ""} recorded.\n\nNote: SMS/email delivery requires your messaging provider integration.`);
    },
  });

  function toggleStatus(s: string) {
    setStatusFilter((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50">
        <Megaphone className="h-4 w-4 text-orange-500" />
        <h3 className="text-sm font-bold text-slate-900">Area Broadcast</h3>
        <span className="text-xs text-slate-500 ml-1">— send a group message to prospects in a specific area</span>
        <button type="button" onClick={() => setShowHistory(!showHistory)}
          className="ml-auto flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800">
          <History className="h-3.5 w-3.5" />
          {showHistory ? "Hide history" : "View history"}
        </button>
      </div>

      {showHistory ? (
        <div className="p-4 space-y-2">
          {!broadcasts || broadcasts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">No broadcasts sent yet</p>
          ) : broadcasts.map((b) => (
            <div key={b.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{b.subject}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{b.message}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-700">{b.recipientCount} recipients</p>
                  <p className="text-[10px] text-slate-400">{new Date(b.sentAt).toLocaleDateString("en-GB")}</p>
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                {b.areaFilter && <span className="rounded bg-slate-100 px-1.5 py-0.5">Area: {b.areaFilter}</span>}
                {b.statusFilter && <span className="rounded bg-slate-100 px-1.5 py-0.5">Status: {b.statusFilter}</span>}
                <span className="rounded bg-slate-100 px-1.5 py-0.5">Sent by {b.sentBy.firstName} {b.sentBy.lastName}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Area / Town</label>
              <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-slate-400">
                <option value="">All areas</option>
                {towns.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Pipeline Status</label>
              <div className="flex flex-wrap gap-1.5">
                {(["NEW", "CONTACTED", "INTERVIEWED", "OFFERED", "DECLINED"] as ProspectStatus[]).map((s) => (
                  <button key={s} type="button" onClick={() => toggleStatus(s)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-semibold border transition",
                      statusFilter.includes(s)
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-slate-400",
                    )}>
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line *"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-slate-400 mb-2" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Message body — introduce the opportunity, location, pay range, how to apply…" rows={5}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400" />
          </div>

          {send.isSuccess && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Broadcast recorded successfully
            </div>
          )}
          {send.isError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{send.error.message}</p>
          )}

          <div className="flex justify-end">
            <button type="button"
              disabled={!subject.trim() || !message.trim() || send.isPending}
              onClick={() => send.mutate({
                subject,
                message,
                areaFilter:   areaFilter  || undefined,
                statusFilter: statusFilter.length > 0 ? statusFilter.join(",") : undefined,
              })}
              className="flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors">
              {send.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Broadcast
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface ProspectsClientProps {
  sites: { id: string; name: string }[];
}

export function ProspectsClient({ sites }: ProspectsClientProps) {
  const [tab, setTab]           = useState<ProspectStatus | "ALL">("ALL");
  const [search, setSearch]     = useState("");
  const [townFilter, setTownFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editProspect, setEditProspect] = useState<ProspectRow | null>(null);
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBroadcast, setShowBroadcast] = useState(false);

  const utils = trpc.useUtils();

  const { data: counts }    = trpc.prospects.statusCounts.useQuery();
  const { data: towns }     = trpc.prospects.listTowns.useQuery();
  const { data: prospects, isLoading } = trpc.prospects.list.useQuery({
    status: tab === "ALL" ? undefined : tab,
    search: search.trim() || undefined,
    town:   townFilter    || undefined,
  });

  const create = trpc.prospects.create.useMutation({
    onSuccess: () => {
      void utils.prospects.list.invalidate();
      void utils.prospects.statusCounts.invalidate();
      void utils.prospects.listTowns.invalidate();
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const update = trpc.prospects.update.useMutation({
    onSuccess: () => {
      void utils.prospects.list.invalidate();
      void utils.prospects.statusCounts.invalidate();
      void utils.prospects.listTowns.invalidate();
      setEditProspect(null);
    },
  });

  const remove = trpc.prospects.remove.useMutation({
    onSuccess: () => {
      void utils.prospects.list.invalidate();
      void utils.prospects.statusCounts.invalidate();
      setDeleteId(null);
    },
  });

  const importValeters = trpc.prospects.importExistingValeters.useMutation({
    onSuccess: (data) => {
      void utils.prospects.list.invalidate();
      void utils.prospects.statusCounts.invalidate();
      if (data.created === 0) {
        alert("All existing valeters are already in Opportunities.");
      } else {
        alert(`${data.created} valeter${data.created !== 1 ? "s" : ""} imported into Opportunities.`);
      }
    },
  });

  // When opening edit, populate form
  useEffect(() => {
    if (editProspect) setForm(prospectToForm(editProspect));
  }, [editProspect]);

  const rows = (prospects ?? []) as ProspectRow[];

  return (
    <div className="space-y-5">

      {/* Pipeline stat chips */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab("ALL")}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
            tab === "ALL" ? "border-transparent bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
          )}>
          All <span className="tabular-nums opacity-70">{counts?.total ?? 0}</span>
        </button>
        {ALL_STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => setTab(s)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
              tab === s ? "border-transparent bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}>
            <span className={cn("inline-block h-1.5 w-1.5 rounded-full", STATUS_CONFIG[s].dot)} />
            {STATUS_CONFIG[s].label}
            <span className="tabular-nums opacity-70">{counts?.[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, area…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-slate-400" />
        </div>

        {/* Town filter */}
        {(towns?.length ?? 0) > 0 && (
          <select value={townFilter} onChange={(e) => setTownFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-slate-400">
            <option value="">All areas</option>
            {(towns ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        )}

        <button type="button"
          onClick={() => setShowBroadcast(!showBroadcast)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
            showBroadcast ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
          )}>
          <Megaphone className="h-4 w-4" /> Broadcast
        </button>

        <button type="button"
          onClick={() => importValeters.mutate()}
          disabled={importValeters.isPending}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
          {importValeters.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
          Import Valeters
        </button>

        <button type="button"
          onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setEditProspect(null); }}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition">
          <UserPlus className="h-4 w-4" /> Add Opportunity
        </button>
      </div>

      {/* Broadcast panel */}
      {showBroadcast && <BroadcastPanel towns={towns ?? []} />}

      {/* Prospect list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-14 text-center">
          <UserPlus className="mx-auto mb-3 h-8 w-8 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">No opportunities yet</p>
          <p className="text-xs text-slate-400 mt-1">Add prospects manually or import existing valeters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <ProspectCard key={p.id} prospect={p} sites={sites}
              onEdit={(prospect) => setEditProspect(prospect)}
              onDelete={(id) => setDeleteId(id)} />
          ))}
        </div>
      )}

      {/* Add / Edit drawer */}
      {(showForm || editProspect) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
              <h3 className="text-base font-bold text-slate-900">
                {editProspect ? `Edit — ${editProspect.firstName} ${editProspect.lastName}` : "New Opportunity"}
              </h3>
              <button type="button" onClick={() => { setShowForm(false); setEditProspect(null); }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ProspectForm form={form} setForm={setForm} sites={sites} />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100 shrink-0">
              <button type="button" onClick={() => { setShowForm(false); setEditProspect(null); }}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                Cancel
              </button>
              <button type="button"
                disabled={!form.firstName.trim() || !form.lastName.trim() || create.isPending || update.isPending}
                onClick={() => {
                  const payload = formToApi(form);
                  if (editProspect) {
                    update.mutate({ id: editProspect.id, ...payload });
                  } else {
                    create.mutate(payload);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50 transition">
                {(create.isPending || update.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {editProspect ? "Save Changes" : "Add Opportunity"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-base font-bold text-slate-900">Remove this opportunity?</h3>
            <p className="mb-5 text-sm text-slate-500">They will be permanently removed from the pipeline. This cannot be undone.</p>
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
