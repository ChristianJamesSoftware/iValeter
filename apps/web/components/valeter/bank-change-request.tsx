"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { Landmark, Camera, AlertCircle, CheckCircle2, Clock, XCircle, ChevronDown, ChevronUp, Info } from "lucide-react";

const STATUS_CONFIG = {
  VALETER_REQUESTED: { label: "Under review", colour: "bg-amber-100 text-amber-700", icon: Clock },
  PENDING:           { label: "Manager approved — ops processing", colour: "bg-blue-100 text-blue-700", icon: Clock },
  APPROVED:          { label: "Approved & applied", colour: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  REJECTED:          { label: "Not approved", colour: "bg-red-100 text-red-700", icon: XCircle },
} as const;

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function BankChangeRequest() {
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    newSortCode: "",
    newAccountNumber: "",
    newAccountName: "",
    newBankReference: "",
    evidenceUrl: "",
  });
  const [photoLabel, setPhotoLabel] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.bankChanges.myRequests.useQuery(undefined, {
    enabled: open,
  });

  const submit = trpc.bankChanges.valeterRequest.useMutation({
    onSuccess: () => {
      void utils.bankChanges.myRequests.invalidate();
      setShowForm(false);
      setForm({ newSortCode: "", newAccountNumber: "", newAccountName: "", newBankReference: "", evidenceUrl: "" });
      setPhotoLabel(null);
    },
  });

  const hasPending = requests?.some((r) =>
    r.status === "VALETER_REQUESTED" || r.status === "PENDING"
  ) ?? false;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const sc = form.newSortCode.replace(/\D/g, "");
    const an = form.newAccountNumber.replace(/\D/g, "");
    if (sc.length !== 6) return;
    if (an.length < 8) return;
    if (!form.newAccountName.trim()) return;

    submit.mutate({
      newSortCode:      sc,
      newAccountNumber: an,
      newAccountName:   form.newAccountName.trim(),
      newBankReference: form.newBankReference.trim() || undefined,
      evidenceUrl:      form.evidenceUrl.trim() || undefined,
    });
  }

  // Simulate photo capture — in a real app this would use the device camera
  function handlePhotoCapture() {
    const name = `bank-statement-${Date.now()}.jpg`;
    setPhotoLabel(name);
    setForm((f) => ({ ...f, evidenceUrl: `https://uploads.ivaleter.co.uk/bank-evidence/${name}` }));
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white/10">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2.5">
          <Landmark className="h-4 w-4 text-orange-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
            Bank Details Change
          </span>
          {hasPending && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-400">
              In progress
            </span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-white/30" />
        ) : (
          <ChevronDown className="h-4 w-4 text-white/30" />
        )}
      </button>

      {open && (
        <div className="border-t border-white/10 px-5 py-4 space-y-4">
          {/* Fee notice */}
          <div className="flex items-start gap-2.5 rounded-xl bg-white/5 px-4 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
            <p className="text-xs leading-relaxed text-white/60">
              A <span className="font-bold text-white">£25 admin fee</span> applies to every bank details change. This will be deducted from your pay once your request has been reviewed and approved by your account manager.
            </p>
          </div>

          {/* Previous requests */}
          {isLoading && (
            <p className="text-sm text-white/40">Loading…</p>
          )}

          {requests && requests.length > 0 && (
            <div className="space-y-2">
              {requests.map((req) => {
                const cfg = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG];
                const Icon = cfg?.icon ?? Clock;
                return (
                  <div key={req.id} className="rounded-xl bg-white/5 px-4 py-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-white/50" />
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          cfg?.colour ?? "bg-slate-100 text-slate-600",
                        )}>
                          {cfg?.label ?? req.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/30">{fmtDate(req.createdAt)}</span>
                    </div>
                    <p className="text-xs text-white/60">
                      {req.newAccountName} · ••{req.newSortCode.slice(-2)} / ••••{req.newAccountNumber.slice(-4)}
                    </p>
                    {req.notes && (
                      <p className="text-xs italic text-white/40">{req.notes}</p>
                    )}
                    <p className="text-[10px] text-white/30">
                      £{req.feeAmount} fee ·{" "}
                      {req.feeDeducted
                        ? <span className="text-red-400">Deducted from pay</span>
                        : <span className="text-amber-400">Pending deduction</span>}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Form */}
          {!hasPending && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-sm font-semibold text-white/60 hover:border-white/40 hover:text-white/80 transition"
            >
              <Landmark className="h-4 w-4" />
              Request bank details change
            </button>
          )}

          {hasPending && !requests?.some((r) => r.status === "APPROVED" || r.status === "REJECTED") && (
            <p className="text-center text-xs text-white/40">
              Your request is being reviewed. You can submit a new one once this is resolved.
            </p>
          )}

          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-white/50">
                New bank details
              </p>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Sort code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  className="h-10 w-full rounded-xl bg-white/10 px-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="12-34-56"
                  value={form.newSortCode}
                  onChange={(e) => setForm((f) => ({ ...f, newSortCode: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Account number
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  className="h-10 w-full rounded-xl bg-white/10 px-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="12345678"
                  value={form.newAccountNumber}
                  onChange={(e) => setForm((f) => ({ ...f, newAccountNumber: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Account name
                </label>
                <input
                  type="text"
                  className="h-10 w-full rounded-xl bg-white/10 px-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="Full name on the account"
                  value={form.newAccountName}
                  onChange={(e) => setForm((f) => ({ ...f, newAccountName: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Payment reference (optional)
                </label>
                <input
                  type="text"
                  maxLength={18}
                  className="h-10 w-full rounded-xl bg-white/10 px-3.5 text-sm text-white placeholder:text-white/30 outline-none focus:ring-2 focus:ring-orange-500/50"
                  placeholder="e.g. your pay reference"
                  value={form.newBankReference}
                  onChange={(e) => setForm((f) => ({ ...f, newBankReference: e.target.value }))}
                />
              </div>

              {/* Photo evidence */}
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-white/40">
                  Bank statement photo <span className="font-normal normal-case text-white/30">(recommended)</span>
                </label>
                <button
                  type="button"
                  onClick={handlePhotoCapture}
                  className={cn(
                    "flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition",
                    photoLabel
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : "border-dashed border-white/20 bg-white/5 text-white/50 hover:border-white/40 hover:text-white/70",
                  )}
                >
                  {photoLabel ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Photo captured
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4" />
                      Take photo of bank statement
                    </>
                  )}
                </button>
                {photoLabel && (
                  <p className="mt-1 text-[10px] text-white/30 text-center truncate">{photoLabel}</p>
                )}
              </div>

              {submit.error && (
                <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {submit.error.message}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={
                    submit.isPending ||
                    form.newSortCode.replace(/\D/g, "").length !== 6 ||
                    form.newAccountNumber.replace(/\D/g, "").length < 8 ||
                    !form.newAccountName.trim()
                  }
                  className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-40"
                >
                  {submit.isPending ? "Submitting…" : "Submit request"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); submit.reset(); }}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/40 hover:text-white/60"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
