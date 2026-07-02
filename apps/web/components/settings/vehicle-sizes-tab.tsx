"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Info } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import type { RouterOutputs } from "@/lib/trpc/react";

type SizeConfig = RouterOutputs["vehicleSizeConfig"]["getAll"][number];

const SIZE_LABELS: Record<string, { name: string; example: string }> = {
  SMALL:  { name: "Small",  example: "Hatchback, City Car" },
  MEDIUM: { name: "Medium", example: "Saloon, Small SUV" },
  LARGE:  { name: "Large",  example: "Estate, Large SUV — baseline" },
  XL:     { name: "XL",     example: "Large 4×4, Pickup" },
  VAN:    { name: "Van",    example: "Transit, Sprinter" },
};

const SIZE_ORDER = ["SMALL", "MEDIUM", "LARGE", "XL", "VAN"] as const;

const inputCls =
  "h-9 w-full rounded-lg border border-[#D4D1CA] bg-white px-3 text-sm text-[#28251D] outline-none transition focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20 text-right";

function poundsToString(pence: number | null | undefined): string {
  if (pence == null) return "";
  const p = Math.abs(pence);
  const sign = pence < 0 ? "-" : pence > 0 ? "+" : "";
  return `${sign}${(p / 100).toFixed(2)}`;
}
function poundsToPence(val: string): number {
  // Strip £ sign, parse, convert to pence
  const clean = val.replace(/[£+\s]/g, "").trim();
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100);
}
function basePoundsToPence(val: string): number | null {
  const clean = val.replace(/[£\s]/g, "").trim();
  if (clean === "" || clean === "-") return null;
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? null : Math.round(parsed * 100);
}

interface RowState {
  size: string;
  basePricePence: number | null; // LARGE only
  baseAllocMins: number | null;  // LARGE only
  deltaPricePence: number;
  deltaMins: number;
  label: string;
}

function buildInitialRows(configs: SizeConfig[]): RowState[] {
  return configs.map((c) => ({
    size: c.size,
    basePricePence: c.basePricePence,
    baseAllocMins: c.baseAllocMins,
    deltaPricePence: c.deltaPricePence,
    deltaMins: c.deltaMins,
    label: c.label ?? SIZE_LABELS[c.size]?.name ?? c.size,
  }));
}

export function VehicleSizesTab() {
  const utils = trpc.useUtils();
  const { data: configs, isLoading } = trpc.vehicleSizeConfig.getAll.useQuery();
  const saveAll = trpc.vehicleSizeConfig.saveAll.useMutation({
    onSuccess: () => {
      utils.vehicleSizeConfig.getAll.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const [rows, setRows] = useState<RowState[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (configs) setRows(buildInitialRows(configs));
  }, [configs]);

  function updateRow(size: string, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r) => (r.size === size ? { ...r, ...patch } : r)));
  }

  function handleSave() {
    saveAll.mutate(
      rows.map((r) => ({
        size: r.size as "SMALL" | "MEDIUM" | "LARGE" | "XL" | "VAN",
        basePricePence: r.size === "LARGE" ? r.basePricePence : undefined,
        baseAllocMins:  r.size === "LARGE" ? r.baseAllocMins  : undefined,
        deltaPricePence: r.deltaPricePence,
        deltaMins: r.deltaMins,
        label: r.label,
        isActive: true,
      })),
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading vehicle sizes…
      </div>
    );
  }

  const largeRow = rows.find((r) => r.size === "LARGE");

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-[#01696F]/20 bg-[#01696F]/5 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#01696F]" />
        <p className="text-sm text-[#28251D]">
          <span className="font-semibold">Large is the baseline.</span> Set the base price
          and time for a Large vehicle — all other sizes adjust relative to it.
          Price and time are used for piece-work invoicing and calendar allocation only.
          If no size is selected on a booking, Large defaults are used.
        </p>
      </div>

      {/* LARGE — baseline config */}
      <div className="rounded-xl border-2 border-[#01696F]/40 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex rounded-full bg-[#01696F] px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
            Baseline
          </span>
          <h3 className="font-heading font-bold text-[#28251D]">Large Vehicle</h3>
          <span className="text-sm text-slate-400">— Estate, Large SUV</span>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Base Price (£)
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">£</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={largeRow?.basePricePence != null ? (largeRow.basePricePence / 100).toFixed(2) : ""}
                onChange={(e) => {
                  const pence = basePoundsToPence(e.target.value);
                  updateRow("LARGE", { basePricePence: pence });
                }}
                placeholder="e.g. 20.00"
                className="h-9 w-full rounded-lg border border-[#D4D1CA] bg-white pl-7 pr-3 text-sm text-[#28251D] outline-none transition focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20"
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">For piece-work invoicing</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Base Time (mins)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={largeRow?.baseAllocMins ?? ""}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                updateRow("LARGE", { baseAllocMins: isNaN(v) ? null : v });
              }}
              placeholder="e.g. 60"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">Calendar allocation time</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Display Label
            </label>
            <input
              type="text"
              value={largeRow?.label ?? "Large"}
              onChange={(e) => updateRow("LARGE", { label: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Other sizes — delta rows */}
      <div className="rounded-xl border border-[#D4D1CA] bg-white p-5">
        <h3 className="mb-1 font-heading text-sm font-black uppercase tracking-wider text-slate-500">
          Size Adjustments
        </h3>
        <p className="mb-4 text-xs text-slate-400">
          Set how much to add or subtract from the Large baseline for each size.
          Use negative values to reduce time or price.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="pb-2 pr-4 text-left">Size</th>
                <th className="pb-2 pr-4 text-left">Example vehicles</th>
                <th className="pb-2 pr-4 text-right w-32">Price delta (£)</th>
                <th className="pb-2 pr-4 text-right w-32">Time delta (mins)</th>
                <th className="pb-2 text-right w-32">Label</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows
                .filter((r) => r.size !== "LARGE")
                .map((row) => {
                  const meta = SIZE_LABELS[row.size] ?? { name: row.size, example: "" };
                  return (
                    <tr key={row.size} className="group">
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-[#28251D]">{meta.name}</span>
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{meta.example}</td>
                      <td className="py-3 pr-4">
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            value={row.deltaPricePence !== 0 ? (row.deltaPricePence / 100).toFixed(2) : ""}
                            onChange={(e) => {
                              const pence = poundsToPence(e.target.value);
                              updateRow(row.size, { deltaPricePence: pence });
                            }}
                            placeholder="e.g. -5.00"
                            className={inputCls}
                          />
                        </div>
                        {largeRow?.basePricePence != null && (
                          <p className="mt-0.5 text-xs text-slate-400 text-right">
                            = £{((largeRow.basePricePence + row.deltaPricePence) / 100).toFixed(2)}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <input
                          type="number"
                          step="1"
                          value={row.deltaMins !== 0 ? row.deltaMins : ""}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            updateRow(row.size, { deltaMins: isNaN(v) ? 0 : v });
                          }}
                          placeholder="e.g. -5"
                          className={inputCls}
                        />
                        {largeRow?.baseAllocMins != null && (
                          <p className="mt-0.5 text-xs text-slate-400 text-right">
                            = {largeRow.baseAllocMins + row.deltaMins} mins
                          </p>
                        )}
                      </td>
                      <td className="py-3">
                        <input
                          type="text"
                          value={row.label}
                          onChange={(e) => updateRow(row.size, { label: e.target.value })}
                          className={inputCls}
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary preview */}
      {largeRow?.basePricePence != null && largeRow?.baseAllocMins != null && (
        <div className="rounded-xl border border-[#D4D1CA] bg-[#F7F6F2] p-5">
          <h3 className="mb-3 font-heading text-sm font-black uppercase tracking-wider text-slate-500">
            Preview — effective values
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {rows.map((r) => {
              const effectivePrice = largeRow.basePricePence! + r.deltaPricePence;
              const effectiveMins  = largeRow.baseAllocMins!  + r.deltaMins;
              const isBase = r.size === "LARGE";
              return (
                <div
                  key={r.size}
                  className={`rounded-lg border p-3 text-center ${
                    isBase ? "border-[#01696F]/30 bg-[#01696F]/5" : "border-[#D4D1CA] bg-white"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{r.label || r.size}</p>
                  <p className="mt-1 text-lg font-bold text-[#28251D]">
                    £{(effectivePrice / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-500">{effectiveMins} mins</p>
                  {isBase && (
                    <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider text-[#01696F]">
                      Baseline
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveAll.isPending}
          className="flex h-9 items-center gap-2 rounded-lg bg-[#01696F] px-5 text-sm font-semibold text-white transition hover:bg-[#015a5f] disabled:opacity-60"
        >
          {saveAll.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Vehicle Sizes
        </button>
        {saved && (
          <span className="text-sm font-semibold text-emerald-600">
            ✓ Saved successfully
          </span>
        )}
        {saveAll.error && (
          <span className="text-sm text-red-600">{saveAll.error.message}</span>
        )}
      </div>
    </div>
  );
}
