"use client";

import { useState } from "react";
import { Plus, Edit2, Trash2, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { trpc, RouterOutputs } from "@/lib/trpc/react";

type ComplianceUser = RouterOutputs["compliance"]["list"][number];
type ComplianceDoc = ComplianceUser["complianceDocuments"][number];

const DOC_TYPES = ["DBS", "RTW", "DRIVING_LICENCE", "CONTRACT"] as const;
type DocType = (typeof DOC_TYPES)[number];

const DOC_LABELS: Record<DocType, string> = {
  DBS: "DBS Check",
  RTW: "Right to Work",
  DRIVING_LICENCE: "Driving Licence",
  CONTRACT: "Contract",
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  VALID: {
    label: "Valid",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  PENDING: {
    label: "Pending",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  EXPIRED: {
    label: "Expired",
    cls: "bg-red-50 text-red-600 border-red-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  FLAGGED: {
    label: "Flagged",
    cls: "bg-red-50 text-red-600 border-red-200",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function isExpiringSoon(d: Date | string | null | undefined): boolean {
  if (!d) return false;
  const date = typeof d === "string" ? new Date(d) : d;
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  return date > new Date() && date <= in30;
}

type ModalState = {
  mode: "add" | "edit";
  userId: string;
  doc: ComplianceDoc | null;
};

const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#E8650A] focus:ring-2 focus:ring-orange-100";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1";

export function ComplianceClient() {
  const utils = trpc.useUtils();
  const { data: users = [], isLoading } = trpc.compliance.list.useQuery();

  const upsert = trpc.compliance.upsert.useMutation({
    onSuccess: () => {
      void utils.compliance.list.invalidate();
      setModal(null);
    },
  });
  const del = trpc.compliance.delete.useMutation({
    onSuccess: () => void utils.compliance.list.invalidate(),
  });

  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState({
    type: "DBS" as DocType,
    status: "PENDING" as string,
    reference: "",
    issuedAt: "",
    expiresAt: "",
    notes: "",
  });

  function openAdd(userId: string) {
    setForm({ type: "DBS", status: "PENDING", reference: "", issuedAt: "", expiresAt: "", notes: "" });
    setModal({ mode: "add", userId, doc: null });
  }

  function openEdit(userId: string, doc: ComplianceDoc) {
    setForm({
      type: doc.type as DocType,
      status: doc.status,
      reference: doc.reference ?? "",
      issuedAt: doc.issuedAt ? new Date(doc.issuedAt).toISOString().slice(0, 10) : "",
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString().slice(0, 10) : "",
      notes: doc.notes ?? "",
    });
    setModal({ mode: "edit", userId, doc });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!modal) return;
    upsert.mutate({
      docId: modal.doc?.id ?? undefined,
      userId: modal.userId,
      type: form.type,
      status: form.status as "PENDING" | "VALID" | "EXPIRED" | "FLAGGED",
      reference: form.reference || undefined,
      issuedAt: form.issuedAt || undefined,
      expiresAt: form.expiresAt || undefined,
      notes: form.notes || undefined,
    });
  }

  const th = "bg-[#F5F0E8] text-[11px] font-bold uppercase tracking-wider text-[#1C1A16]/50 px-4 py-3 text-left";
  const td = "border-b border-slate-100 text-sm text-slate-700 px-4 py-3.5";

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-slate-400">
        Loading compliance data…
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>Valeter</th>
              {DOC_TYPES.map((t) => (
                <th key={t} className={th}>{DOC_LABELS[t]}</th>
              ))}
              <th className={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-slate-400">
                  No valeters found. Add team members first.
                </td>
              </tr>
            )}
            {users.map((user) => {
              const docByType = Object.fromEntries(
                user.complianceDocuments.map((d) => [d.type, d]),
              ) as Record<string, ComplianceDoc | undefined>;

              return (
                <tr key={user.id} className="hover:bg-[#F5F0E8]/40 transition-colors">
                  <td className={`${td} font-medium text-[#1C1A16]`}>
                    {user.firstName} {user.lastName}
                  </td>
                  {DOC_TYPES.map((docType) => {
                    const doc = docByType[docType];
                    if (!doc) {
                      return (
                        <td key={docType} className={td}>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-400">
                            Missing
                          </span>
                        </td>
                      );
                    }
                    const cfg = STATUS_CONFIG[doc.status] ?? STATUS_CONFIG["PENDING"]!;
                    const expiring = doc.expiresAt ? isExpiringSoon(doc.expiresAt) : false;
                    return (
                      <td key={docType} className={td}>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => openEdit(user.id, doc)}
                            className={`flex w-fit items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition hover:opacity-80 ${cfg.cls}`}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </button>
                          {doc.expiresAt && (
                            <span
                              className={`text-[11px] ${
                                expiring ? "font-semibold text-amber-600" : "text-slate-400"
                              }`}
                            >
                              {expiring && <AlertTriangle className="mr-0.5 inline h-3 w-3" />}
                              Exp: {fmtDate(doc.expiresAt)}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAdd(user.id)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8650A] text-white transition hover:bg-orange-600"
                        title="Add document"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="font-heading text-base font-black text-[#1C1A16]">
                {modal.mode === "add" ? "Add Compliance Document" : "Edit Compliance Document"}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Document Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as DocType })}
                    className={inputCls}
                  >
                    {DOC_TYPES.map((t) => (
                      <option key={t} value={t}>{DOC_LABELS[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className={inputCls}
                  >
                    {["PENDING", "VALID", "EXPIRED", "FLAGGED"].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Reference / Number</label>
                  <input
                    placeholder="e.g. DBS123456"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Issued Date</label>
                  <input
                    type="date"
                    value={form.issuedAt}
                    onChange={(e) => setForm({ ...form, issuedAt: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Notes</label>
                  <input
                    placeholder="Optional notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>

              {modal.mode === "edit" && modal.doc && (
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      if (modal.doc) {
                        del.mutate({ id: modal.doc.id });
                        setModal(null);
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete document
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={upsert.isPending}
                  className="h-10 rounded-lg bg-[#E8650A] px-5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-60"
                >
                  {upsert.isPending ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
