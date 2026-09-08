"use client";

import { useState } from "react";
import { Plus, Trash2, AlertTriangle, CheckCircle2, Clock, XCircle, ExternalLink } from "lucide-react";
import { trpc, RouterOutputs } from "@/lib/trpc/react";
import { PageHeader } from "@/components/dashboard/page-header";

type TrainingUser = RouterOutputs["training"]["list"][number];
type TrainingRecord = TrainingUser["trainingRecords"][number];

function getExpiryStatus(expiresAt: Date | string | null | undefined) {
  if (!expiresAt) return null;
  const date = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const in30 = new Date();
  in30.setDate(now.getDate() + 30);
  if (date < now) return "expired";
  if (date <= in30) return "expiring";
  return "valid";
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

const statusBadge: Record<string, { cls: string; label: string }> = {
  valid: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", label: "Valid" },
  expiring: { cls: "bg-amber-50 text-amber-700 border-amber-200", label: "Expiring Soon" },
  expired: { cls: "bg-red-50 text-red-600 border-red-200", label: "Expired" },
};

const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-[#E8650A] focus:ring-2 focus:ring-orange-100";
const labelCls = "block text-xs font-semibold text-slate-500 mb-1";
const th = "bg-[#F5F0E8] text-[11px] font-bold uppercase tracking-wider text-[#1C1A16]/50 px-5 py-3 text-left";
const td = "border-b border-slate-100 text-sm text-slate-700 px-5 py-4";

export function TrainingClient() {
  const utils = trpc.useUtils();
  const { data: users = [], isLoading } = trpc.training.list.useQuery();

  const add = trpc.training.add.useMutation({
    onSuccess: () => {
      void utils.training.list.invalidate();
      setModal(false);
      setForm({ userId: "", course: "", provider: "", completedAt: "", expiresAt: "", certificateUrl: "", notes: "" });
    },
  });

  const del = trpc.training.delete.useMutation({
    onSuccess: () => void utils.training.list.invalidate(),
  });

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    userId: "",
    course: "",
    provider: "",
    completedAt: "",
    expiresAt: "",
    certificateUrl: "",
    notes: "",
  });

  // Compute alerts
  const allRecords: Array<{ user: TrainingUser; record: TrainingRecord }> = [];
  for (const user of users) {
    for (const record of user.trainingRecords) {
      allRecords.push({ user, record });
    }
  }
  const expired = allRecords.filter((r) => getExpiryStatus(r.record.expiresAt) === "expired");
  const expiringSoon = allRecords.filter((r) => getExpiryStatus(r.record.expiresAt) === "expiring");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    add.mutate({
      userId: form.userId,
      course: form.course,
      provider: form.provider || undefined,
      completedAt: form.completedAt || undefined,
      expiresAt: form.expiresAt || undefined,
      certificateUrl: form.certificateUrl || undefined,
      notes: form.notes || undefined,
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Training Records"
        subtitle="Certifications and renewal tracking for your team."
        action={
          <button
            onClick={() => setModal(true)}
            className="flex h-10 items-center gap-2 rounded-lg bg-[#E8650A] px-4 text-sm font-medium text-white transition-colors hover:bg-orange-600"
          >
            <Plus className="h-4 w-4" />
            Add Record
          </button>
        }
      />

      {/* Expiry alerts */}
      {(expired.length > 0 || expiringSoon.length > 0) && (
        <div className="mb-5 space-y-2">
          {expired.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-5 py-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="font-semibold text-red-900">Expired training — renewal required</p>
                <p className="text-sm text-red-700">
                  {expired.map((r) => `${r.user.firstName} ${r.user.lastName} (${r.record.course})`).join(", ")}
                </p>
              </div>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              <div>
                <p className="font-semibold text-amber-900">Training expiring within 30 days</p>
                <p className="text-sm text-amber-700">
                  {expiringSoon.map((r) => `${r.user.firstName} ${r.user.lastName} (${r.record.course})`).join(", ")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="flex h-32 items-center justify-center text-sm text-slate-400">
          Loading training records…
        </div>
      )}

      {!isLoading && (
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full">
            <thead>
              <tr>
                <th className={th}>Valeter</th>
                <th className={th}>Course</th>
                <th className={th}>Provider</th>
                <th className={th}>Completed</th>
                <th className={th}>Expiry</th>
                <th className={th}>Status</th>
                <th className={th}>Certificate</th>
                <th className={th}></th>
              </tr>
            </thead>
            <tbody>
              {allRecords.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-slate-400">
                    No training records yet. Add the first one above.
                  </td>
                </tr>
              )}
              {allRecords.map(({ user, record }) => {
                const expStatus = getExpiryStatus(record.expiresAt);
                const badge = expStatus ? statusBadge[expStatus] : null;
                return (
                  <tr key={record.id} className="hover:bg-[#F5F0E8]/40 transition-colors">
                    <td className={`${td} font-medium text-[#1C1A16]`}>
                      {user.firstName} {user.lastName}
                    </td>
                    <td className={td}>{record.course}</td>
                    <td className={td}>{record.provider ?? "—"}</td>
                    <td className={td}>{fmtDate(record.completedAt)}</td>
                    <td className={td}>
                      <span className={expStatus === "expiring" ? "font-semibold text-amber-600" : ""}>
                        {expStatus === "expiring" && <AlertTriangle className="mr-0.5 inline h-3 w-3" />}
                        {fmtDate(record.expiresAt)}
                      </span>
                    </td>
                    <td className={td}>
                      {badge ? (
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className={td}>
                      {record.certificateUrl ? (
                        <a
                          href={record.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 font-medium text-[#E8650A] hover:underline"
                        >
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400">None</span>
                      )}
                    </td>
                    <td className={td}>
                      <button
                        onClick={() => del.mutate({ id: record.id })}
                        disabled={del.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                        title="Delete record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="font-heading text-base font-black text-[#1C1A16]">Add Training Record</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelCls}>Valeter</label>
                  <select
                    required
                    value={form.userId}
                    onChange={(e) => setForm({ ...form, userId: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Select valeter…</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Course Name</label>
                  <input
                    required
                    placeholder="e.g. Paint Correction L2"
                    value={form.course}
                    onChange={(e) => setForm({ ...form, course: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Provider</label>
                  <input
                    placeholder="e.g. Autoglym Academy"
                    value={form.provider}
                    onChange={(e) => setForm({ ...form, provider: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Completed Date</label>
                  <input
                    type="date"
                    value={form.completedAt}
                    onChange={(e) => setForm({ ...form, completedAt: e.target.value })}
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
                <div className="col-span-2">
                  <label className={labelCls}>Certificate URL</label>
                  <input
                    placeholder="https://… (optional)"
                    value={form.certificateUrl}
                    onChange={(e) => setForm({ ...form, certificateUrl: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Notes</label>
                  <input
                    placeholder="Optional notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className={inputCls}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={add.isPending}
                  className="h-10 rounded-lg bg-[#E8650A] px-5 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-60"
                >
                  {add.isPending ? "Saving…" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
