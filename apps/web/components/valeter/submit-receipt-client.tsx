"use client";

import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc/react";
import { Receipt, Upload, X, CheckCircle2, ChevronDown, ChevronUp, Clock } from "lucide-react";

function pence(p: number) {
  return `£${(p / 100).toFixed(2)}`;
}

function fmtDate(iso: string | Date) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtWeek(iso: string | Date) {
  const d = new Date(iso);
  const end = new Date(d);
  end.setDate(d.getDate() + 6);
  return `w/c ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-500/20 text-amber-300",
  APPROVED: "bg-emerald-500/20 text-emerald-300",
  REJECTED: "bg-red-500/20 text-red-300",
};

export function SubmitReceiptClient() {
  const utils = trpc.useUtils();
  const { data: expenses, isLoading } = trpc.expenses.myExpenses.useQuery();
  const submitMut = trpc.expenses.submit.useMutation({
    onSuccess: () => {
      void utils.expenses.myExpenses.invalidate();
      setShowForm(false);
      setDescription("");
      setAmount("");
      setReceiptUrl(null);
      setPreviewName(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    },
  });

  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Simple base64 "upload" — stores as data URL for now
  // In production this would upload to R2/S3 and return a URL
  function handleFile(file: File) {
    if (!file) return;
    setUploading(true);
    setPreviewName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setReceiptUrl(reader.result as string);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const penceAmount = Math.round(parseFloat(amount) * 100);
    if (!description.trim() || isNaN(penceAmount) || penceAmount <= 0) return;

    await submitMut.mutateAsync({
      description: description.trim(),
      amountPence: penceAmount,
      receiptFileUrl: receiptUrl ?? undefined,
    });
  }

  const pendingCount = expenses?.filter((e) => e.status === "PENDING").length ?? 0;

  return (
    <div className="space-y-4 px-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Receipts & Expenses</h2>
          <p className="text-xs text-white/50">Paid with your weekly wages</p>
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300">
            {pendingCount} pending
          </span>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <p className="text-sm font-semibold text-emerald-300">Receipt submitted to head office</p>
        </div>
      )}

      {/* Submit button / form toggle */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600"
        >
          <Receipt className="h-4 w-4" />
          Submit a Receipt
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl bg-white/10 px-5 py-5"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/60">
              New Receipt
            </p>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-white/40 hover:text-white/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs text-white/60">
              What is it for? <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Car wash soap, fuel top-up…"
              className="w-full rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none ring-1 ring-white/20 focus:ring-orange-400"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1 block text-xs text-white/60">
              Amount requested <span className="text-orange-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-white/60">
                £
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-xl bg-white/10 py-2.5 pl-8 pr-4 text-sm text-white placeholder-white/30 outline-none ring-1 ring-white/20 focus:ring-orange-400"
                required
              />
            </div>
          </div>

          {/* Receipt upload */}
          <div>
            <label className="mb-1 block text-xs text-white/60">
              Receipt photo / PDF (optional but recommended)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {receiptUrl ? (
              <div className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-2.5">
                <span className="truncate text-xs text-white/70">{previewName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptUrl(null);
                    setPreviewName(null);
                  }}
                  className="ml-2 shrink-0 text-white/40 hover:text-white/70"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-xs text-white/50 transition hover:border-white/40 hover:text-white/70 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Processing…" : "Tap to attach receipt"}
              </button>
            )}
          </div>

          <p className="text-[10px] text-white/40">
            This claim will be paid with your wages for the current week.
            Head office will review before payment.
          </p>

          <button
            type="submit"
            disabled={submitMut.isPending || !description.trim() || !amount}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {submitMut.isPending ? "Submitting…" : "Send to Head Office"}
          </button>
        </form>
      )}

      {/* History accordion */}
      {!isLoading && (expenses?.length ?? 0) > 0 && (
        <div className="rounded-2xl bg-white/10">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-4"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
              My Claims
            </span>
            {showHistory ? (
              <ChevronUp className="h-4 w-4 text-white/40" />
            ) : (
              <ChevronDown className="h-4 w-4 text-white/40" />
            )}
          </button>

          {showHistory && (
            <div className="divide-y divide-white/10 px-5 pb-4">
              {expenses?.map((exp) => (
                <div key={exp.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {exp.description}
                      </p>
                      <p className="mt-0.5 text-xs text-white/50">
                        {fmtWeek(exp.weekStarting)} · submitted {fmtDate(exp.createdAt)}
                      </p>
                      {exp.reviewNote && (
                        <p className="mt-1 text-xs text-red-400">Note: {exp.reviewNote}</p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-orange-400">{pence(exp.amountPence)}</p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[exp.status] ?? "bg-white/10 text-white/50"}`}
                      >
                        {exp.status}
                      </span>
                    </div>
                  </div>
                  {exp.receiptFileUrl && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-white/40">
                      <Receipt className="h-3 w-3" />
                      Receipt attached
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isLoading && (
        <div className="py-6 text-center text-xs text-white/40">Loading claims…</div>
      )}
    </div>
  );
}
