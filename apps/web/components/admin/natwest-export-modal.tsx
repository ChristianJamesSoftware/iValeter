"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { X, Landmark, Loader2, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface NatWestExportModalProps {
  weekStart: string;
  onClose: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amount);
}

// Default payment date = next Friday from weekStart
function defaultPaymentDate(weekStart: string): string {
  const d = new Date(weekStart);
  // weekStart = Monday; +4 days = Friday
  d.setDate(d.getDate() + 4);
  return d.toISOString().split("T")[0] ?? weekStart;
}

export function NatWestExportModal({ weekStart, onClose }: NatWestExportModalProps) {
  const [debitAccount, setDebitAccount] = useState("");
  const [paymentDate, setPaymentDate] = useState(defaultPaymentDate(weekStart));
  const [step, setStep] = useState<"config" | "preview" | "done">("config");
  const [exportError, setExportError] = useState<string | null>(null);

  // Preview query — only runs when we have both fields and are in preview step
  const previewEnabled = step === "preview" && debitAccount.trim().length >= 6 && paymentDate.length > 0;

  const { data: preview, isLoading: previewLoading, error: previewError } = trpc.payroll.previewNatWest.useQuery(
    { weekStart, paymentDate, debitAccount: debitAccount.trim() },
    { enabled: previewEnabled },
  );

  const exportMutation = trpc.payroll.exportNatWest.useMutation({
    onSuccess: (data) => {
      // Trigger browser download
      const blob = new Blob([data.fileContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStep("done");
    },
    onError: (err) => {
      setExportError(err.message);
    },
  });

  const canPreview = debitAccount.trim().length >= 6 && paymentDate.length > 0;
  const hasMissing = preview?.lines.some((l) => l.missingBankDetails || l.missingReference) ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E8650A]/10">
              <Landmark className="h-5 w-5 text-[#E8650A]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">NatWest Bankline Export</h2>
              <p className="text-xs text-slate-500">Ad-hoc bulk payment file</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {step === "done" ? (
            // ── Done state ──────────────────────────────────────────────────
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-slate-900">File downloaded</p>
                <p className="mt-1 text-sm text-slate-500">
                  Upload the .txt file to NatWest Bankline under{" "}
                  <span className="font-semibold">Payments → Import file</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-xl bg-slate-900 px-6 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          ) : step === "config" ? (
            // ── Config step ─────────────────────────────────────────────────
            <div className="space-y-5">
              <p className="text-sm text-slate-600">
                This will generate a Bankline payment file for all{" "}
                <span className="font-semibold text-slate-900">approved timesheets</span> in this
                payroll week. Only upload to NatWest once you have reviewed the preview.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Your NatWest debit account number
                    <span className="ml-1 text-xs font-normal text-slate-400">(sort code + account, no spaces — e.g. 50000087654321)</span>
                  </label>
                  <input
                    type="text"
                    value={debitAccount}
                    onChange={(e) => setDebitAccount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="50000087654321"
                    maxLength={14}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm text-slate-900 outline-none focus:border-[#E8650A] focus:ring-2 focus:ring-[#E8650A]/10"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Payment date
                    <span className="ml-1 text-xs font-normal text-slate-400">(date payments should clear)</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#E8650A] focus:ring-2 focus:ring-[#E8650A]/10"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canPreview}
                  onClick={() => setStep("preview")}
                  className="rounded-xl bg-[#E8650A] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c5540a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Preview payments
                </button>
              </div>
            </div>
          ) : (
            // ── Preview step ─────────────────────────────────────────────────
            <div className="space-y-4">
              {/* Summary bar */}
              {preview && (
                <div className="flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <div>
                    <span className="text-slate-500">Reference: </span>
                    <span className="font-mono font-bold text-slate-900">{preview.yourReference}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Payment date: </span>
                    <span className="font-bold text-slate-900">{preview.paymentDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Total: </span>
                    <span className="font-bold text-emerald-700">{formatCurrency(preview.totalAmount)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Payments: </span>
                    <span className="font-bold text-slate-900">{preview.lineCount}</span>
                  </div>
                </div>
              )}

              {/* Missing details warning */}
              {hasMissing && (
                <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>
                    Some valeters are missing bank details or payroll references. The export will
                    be blocked until these are resolved — highlighted in red below.
                  </span>
                </div>
              )}

              {/* Preview table */}
              <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-100">
                {previewLoading ? (
                  <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading preview…
                  </div>
                ) : previewError ? (
                  <div className="px-4 py-6 text-center text-sm text-red-600">
                    {previewError.message}
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        <th className="px-3 py-2.5">Valeter</th>
                        <th className="px-3 py-2.5">Sort code</th>
                        <th className="px-3 py-2.5">Account</th>
                        <th className="px-3 py-2.5">Ref</th>
                        <th className="px-3 py-2.5 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview?.lines.map((line, i) => (
                        <tr
                          key={i}
                          className={cn(
                            "border-b border-slate-50 last:border-0",
                            (line.missingBankDetails || line.missingReference) && "bg-red-50",
                          )}
                        >
                          <td className="px-3 py-2 font-medium text-slate-900">
                            {line.name}
                            {(line.missingBankDetails || line.missingReference) && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-red-600">
                                <AlertTriangle className="h-3 w-3" />
                                {line.missingBankDetails ? "No bank" : "No ref"}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-700">
                            {line.sortCode ?? <span className="text-red-500">—</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-700">
                            {line.accountNumber ?? <span className="text-red-500">—</span>}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500">
                            {line.bankReference ?? <span className="text-amber-500">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-900">
                            {formatCurrency(line.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {exportError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {exportError}
                </div>
              )}

              <div className="flex justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setStep("config"); setExportError(null); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={hasMissing || previewLoading || exportMutation.isPending}
                  onClick={() =>
                    exportMutation.mutate({
                      weekStart,
                      paymentDate,
                      debitAccount: debitAccount.trim(),
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-[#E8650A] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#c5540a] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {exportMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download Bankline file
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
