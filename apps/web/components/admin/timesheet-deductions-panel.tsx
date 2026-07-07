"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { MinusCircle, Plus, Trash2, AlertCircle, ChevronDown, ChevronUp, Receipt } from "lucide-react";

type DeductionType = "DAILY" | "ACCIDENT" | "UNIFORM" | "STANDING" | "EXPENSE" | "OTHER";
type ManualDeductionType = "DAILY" | "ACCIDENT" | "UNIFORM" | "STANDING" | "OTHER";

const TYPE_LABELS: Record<DeductionType, string> = {
  DAILY:    "Daily deduction",
  ACCIDENT: "Accident excess",
  UNIFORM:  "Uniform/equipment",
  STANDING: "Standing deduction",
  EXPENSE:  "Expense reimbursement",
  OTHER:    "Other",
};

const TYPE_COLOURS: Record<DeductionType, string> = {
  DAILY:    "bg-amber-100 text-amber-700",
  ACCIDENT: "bg-red-100 text-red-700",
  UNIFORM:  "bg-blue-100 text-blue-700",
  STANDING: "bg-purple-100 text-purple-700",
  EXPENSE:  "bg-emerald-100 text-emerald-700",
  OTHER:    "bg-slate-100 text-slate-600",
};

const INPUT = "h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100";
const LABEL = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400";

function pence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

export function TimesheetDeductionsPanel({
  timesheetId,
  readOnly = false,
}: {
  timesheetId: string;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "DAILY" as ManualDeductionType,
    description: "",
    amountPounds: "",
  });
  const [removing, setRemoving] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.timesheetDeductions.listForTimesheet.useQuery(
    { timesheetId },
    { enabled: !!timesheetId },
  );

  const add = trpc.timesheetDeductions.add.useMutation({
    onSuccess: () => {
      void utils.timesheetDeductions.listForTimesheet.invalidate({ timesheetId });
      setForm({ type: "DAILY" as ManualDeductionType, description: "", amountPounds: "" });
      setShowForm(false);
    },
  });

  const remove = trpc.timesheetDeductions.remove.useMutation({
    onSuccess: () => {
      void utils.timesheetDeductions.listForTimesheet.invalidate({ timesheetId });
      setRemoving(null);
    },
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const pounds = parseFloat(form.amountPounds);
    if (!form.description.trim() || isNaN(pounds) || pounds <= 0) return;
    add.mutate({
      timesheetId,
      type: form.type,
      description: form.description.trim(),
      amountPence: Math.round(pounds * 100),
    });
  }

  const totalDeductionPence = data?.totalDeductionPence ?? 0;
  const totalExpensePence = data?.totalExpenseReimbursementPence ?? 0;
  const hasDeductions = (data?.deductions.length ?? 0) > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      {/* Header — always visible, click to expand */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 hover:bg-slate-50 transition"
      >
        <div className="flex items-center gap-2">
          <MinusCircle className={cn("h-4 w-4", hasDeductions ? "text-red-500" : "text-slate-400")} />
          <span className="text-sm font-bold text-slate-800">Deductions</span>
          {hasDeductions && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              -{pence(totalDeductionPence)}
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-4 py-4 space-y-4">
          {isLoading && (
            <p className="text-sm text-slate-400">Loading…</p>
          )}

          {/* Pay summary */}
          {data && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Days worked</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{data.daysWorked}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gross pay</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{pence(data.grossPence)}</p>
                </div>
                <div className={cn(
                  "rounded-lg px-3 py-2.5 text-center",
                  data.finalPayPence >= data.grossPence ? "bg-emerald-50" : "bg-amber-50",
                )}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Final pay</p>
                  <p className={cn(
                    "mt-1 text-lg font-bold",
                    data.finalPayPence >= data.grossPence ? "text-emerald-700" : "text-amber-700",
                  )}>
                    {pence(data.finalPayPence)}
                  </p>
                </div>
              </div>
              {/* Expense reimbursement summary pill */}
              {totalExpensePence > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                  <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs text-emerald-700">
                    Includes <span className="font-bold">{pence(totalExpensePence)}</span> expense reimbursement bundled into this week&apos;s pay
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Deduction list */}
          {data && data.deductions.length > 0 && (
            <div className="divide-y divide-slate-50 overflow-hidden rounded-xl border border-slate-100">
              {data.deductions.map((d) => {
                const isExpense = d.type === "EXPENSE";
                return (
                  <div key={d.id} className={cn(
                    "flex items-center gap-3 px-3 py-2.5",
                    isExpense && "bg-emerald-50/50",
                  )}>
                    <span className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      TYPE_COLOURS[d.type as DeductionType],
                    )}>
                      {TYPE_LABELS[d.type as DeductionType]}
                    </span>
                    <span className="flex-1 text-sm text-slate-700">{d.description}</span>
                    <span className={cn(
                      "shrink-0 font-bold",
                      isExpense ? "text-emerald-600" : "text-red-600",
                    )}>
                      {isExpense ? "+" : "-"}{pence(d.amountPence)}
                    </span>
                    {!readOnly && !isExpense && (
                      <button
                        type="button"
                        disabled={removing === d.id || remove.isPending}
                        onClick={() => {
                          setRemoving(d.id);
                          remove.mutate({ id: d.id });
                        }}
                        className="shrink-0 rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {isExpense && <div className="w-5" />}
                  </div>
                );
              })}

              {/* Summary rows */}
              {totalDeductionPence > 0 && (
                <div className="flex items-center justify-between bg-slate-50 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total deductions</span>
                  <span className="font-bold text-red-600">-{pence(totalDeductionPence)}</span>
                </div>
              )}
              {totalExpensePence > 0 && (
                <div className="flex items-center justify-between bg-emerald-50 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Expense reimbursements</span>
                  <span className="font-bold text-emerald-600">+{pence(totalExpensePence)}</span>
                </div>
              )}
            </div>
          )}

          {data && data.deductions.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-2">No deductions applied</p>
          )}

          {/* Add deduction form */}
          {!readOnly && (
            <>
              {!showForm ? (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-500 hover:border-slate-400 hover:text-slate-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  Add deduction
                </button>
              ) : (
                <form onSubmit={handleAdd} className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">New deduction</p>

                  <div>
                    <label className={LABEL}>Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ManualDeductionType }))}
                      className={INPUT}
                    >
                      {(Object.keys(TYPE_LABELS) as DeductionType[]).filter((t) => t !== "EXPENSE").map((t) => (
                        <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={LABEL}>Description</label>
                    <input
                      type="text"
                      className={INPUT}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder={
                        form.type === "DAILY"    ? "e.g. Daily deduction — agreed £10/day × 5 days" :
                        form.type === "ACCIDENT" ? "e.g. Accident excess — Ford Focus reg AB21 XYZ" :
                        form.type === "UNIFORM"  ? "e.g. Uniform cost recovery — week 1 of 4" :
                        "e.g. Agreed deduction"
                      }
                      maxLength={200}
                    />
                  </div>

                  <div>
                    <label className={LABEL}>Amount (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      className={INPUT}
                      value={form.amountPounds}
                      onChange={(e) => setForm((f) => ({ ...f, amountPounds: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>

                  {add.error && (
                    <div className="flex items-center gap-1.5 text-xs text-red-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {add.error.message}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={add.isPending || !form.description.trim() || !form.amountPounds}
                      className="flex-1 rounded-xl bg-navy py-2 text-sm font-bold text-white transition hover:bg-navy/90 disabled:opacity-50"
                    >
                      {add.isPending ? "Adding…" : "Add deduction"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowForm(false); add.reset(); }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
