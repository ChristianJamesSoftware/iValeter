"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { Tag, Plus, Pencil, Trash2, CheckCircle2, X, Loader2, Star } from "lucide-react";

// Total Valeting org ID — SA settings always operate in this org context
const ORG_ID = "cmr236nkj000bs48ws2frtiuv";

const INPUT = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-[#E8650A] focus:ring-2 focus:ring-orange-100";
const LABEL = "mb-1 block text-xs font-semibold text-slate-500";

interface FormState {
  id?: string;
  name: string;
  xeroAccountCode: string;
  xeroAccountName: string;
  taxType: string;
  isDefault: boolean;
}

const EMPTY_FORM: FormState = {
  name: "Consumables",
  xeroAccountCode: "",
  xeroAccountName: "",
  taxType: "INPUT2",
  isDefault: true,
};

export function NominalCodesTab() {
  const utils = trpc.useUtils();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: codes, isLoading } = trpc.expenses.listNominalCodes.useQuery({ organisationId: ORG_ID });

  const upsert = trpc.expenses.upsertNominalCode.useMutation({
    onSuccess: () => {
      void utils.expenses.listNominalCodes.invalidate();
      setShowForm(false);
      setForm(EMPTY_FORM);
    },
  });

  const del = trpc.expenses.deleteNominalCode.useMutation({
    onSuccess: () => {
      void utils.expenses.listNominalCodes.invalidate();
      setDeleting(null);
    },
  });

  function handleEdit(code: NonNullable<typeof codes>[number]) {
    setForm({
      id: code.id,
      name: code.name,
      xeroAccountCode: code.xeroAccountCode,
      xeroAccountName: code.xeroAccountName ?? "",
      taxType: code.taxType,
      isDefault: code.isDefault,
    });
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsert.mutate({
      id: form.id,
      organisationId: ORG_ID,
      name: form.name.trim(),
      xeroAccountCode: form.xeroAccountCode.trim(),
      xeroAccountName: form.xeroAccountName.trim() || undefined,
      taxType: form.taxType,
      isDefault: form.isDefault,
    });
  }

  return (
    <div className="max-w-2xl space-y-6 pt-6">
      {/* Explainer */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-4">
        <div className="flex items-start gap-3">
          <Tag className="mt-0.5 h-5 w-5 shrink-0 text-[#E8650A]" />
          <div>
            <h3 className="text-sm font-bold text-slate-800">Xero Expense Nominal Codes</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">
              When a valeter receipt is approved and locked into payroll, it is automatically pushed to Xero
              as a purchase invoice (ACCPAY) under the default nominal code. The <strong>Consumables</strong> code
              is used for all receipt reimbursements — VAT is reclaimed at <strong>INPUT2 (20%)</strong>.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Mark one code as <strong>Default</strong> — it will be used automatically on all expense pushes.
              If no default is set, account code <strong>7400</strong> is used as a fallback.
            </p>
          </div>
        </div>
      </div>

      {/* Code list */}
      {isLoading ? (
        <div className="flex items-center gap-2 py-6 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading nominal codes…</span>
        </div>
      ) : (codes?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
          <Tag className="mx-auto mb-2 h-8 w-8 text-slate-200" />
          <p className="text-sm text-slate-400">No nominal codes configured yet</p>
          <p className="mt-1 text-xs text-slate-300">Add a Consumables code to enable automatic Xero expense pushes</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-100">
          {codes?.map((code) => (
            <div key={code.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{code.name}</span>
                  {code.isDefault && (
                    <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-600">
                      <Star className="h-2.5 w-2.5" /> Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Code: <span className="font-mono font-semibold text-slate-600">{code.xeroAccountCode}</span>
                  {code.xeroAccountName && (
                    <span className="ml-2 text-slate-400">· {code.xeroAccountName}</span>
                  )}
                  <span className="ml-2 text-slate-400">· Tax: {code.taxType}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => handleEdit(code)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {deleting === code.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => del.mutate({ id: code.id })}
                      disabled={del.isPending}
                      className="rounded-lg bg-red-500 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      {del.isPending ? "…" : "Delete"}
                    </button>
                    <button
                      onClick={() => setDeleting(null)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleting(code.id)}
                    className="rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit form */}
      {!showForm ? (
        <button
          onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }}
          className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:border-[#E8650A] hover:text-[#E8650A] transition"
        >
          <Plus className="h-4 w-4" />
          Add nominal code
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-800">{form.id ? "Edit" : "New"} Nominal Code</p>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Consumables"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Xero Account Code</label>
              <input
                type="text"
                required
                value={form.xeroAccountCode}
                onChange={(e) => setForm((f) => ({ ...f, xeroAccountCode: e.target.value }))}
                placeholder="e.g. 7400"
                className={cn(INPUT, "font-mono")}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Xero Account Name (optional)</label>
              <input
                type="text"
                value={form.xeroAccountName}
                onChange={(e) => setForm((f) => ({ ...f, xeroAccountName: e.target.value }))}
                placeholder="e.g. Consumables"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Tax Type</label>
              <select
                value={form.taxType}
                onChange={(e) => setForm((f) => ({ ...f, taxType: e.target.value }))}
                className={INPUT}
              >
                <option value="INPUT2">INPUT2 — 20% VAT (reclaimable)</option>
                <option value="INPUT">INPUT — 0% VAT</option>
                <option value="NONE">NONE — No VAT</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 accent-orange-500"
            />
            <span className="text-sm text-slate-700">Set as default (used for all expense pushes)</span>
          </label>

          {upsert.error && (
            <p className="text-xs text-red-600">{upsert.error.message}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={upsert.isPending || !form.name.trim() || !form.xeroAccountCode.trim()}
              className="flex items-center gap-2 rounded-xl bg-[#E8650A] px-5 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50 transition"
            >
              {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {form.id ? "Save changes" : "Add code"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
