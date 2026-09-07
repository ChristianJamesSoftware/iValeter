"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, Info } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import type { RouterOutputs } from "@/lib/trpc/react";

type SizeConfig = RouterOutputs["vehicleSizeConfig"]["getAll"][number];

const SIZE_META: Record<string, { example: string }> = {
  SMALL:  { example: "Hatchback, City Car" },
  MEDIUM: { example: "Saloon, Small SUV" },
  LARGE:  { example: "Estate, Large SUV" },
  XL:     { example: "Large 4×4, Pickup" },
  VAN:    { example: "Transit, Sprinter" },
};

const SIZE_ORDER = ["SMALL", "MEDIUM", "LARGE", "XL", "VAN"] as const;

interface RowState {
  size: string;
  label: string;
  basePricePence: number | null;
  baseAllocMins: number | null;
  deltaPricePence: number;
  deltaMins: number;
}

function buildInitialRows(configs: SizeConfig[]): RowState[] {
  return SIZE_ORDER.map((size) => {
    const c = configs.find((x) => x.size === size);
    return {
      size,
      label: c?.label ?? size,
      basePricePence: c?.basePricePence ?? null,
      baseAllocMins: c?.baseAllocMins ?? null,
      deltaPricePence: c?.deltaPricePence ?? 0,
      deltaMins: c?.deltaMins ?? 0,
    };
  });
}

const cellInput =
  "h-9 w-full rounded-lg border border-[#D4D1CA] bg-white px-3 text-sm text-[#28251D] outline-none transition focus:border-[#E8650A] focus:ring-2 focus:ring-[#E8650A]/20";

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
        baseAllocMins: r.size === "LARGE" ? r.baseAllocMins : undefined,
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
  const hasBase = largeRow?.basePricePence != null && largeRow?.baseAllocMins != null;

  return (
    <div className="space-y-6">

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <p className="text-sm text-[#28251D]">
          <span className="font-semibold">Large is the baseline.</span> Set its price and time, then use the delta columns to add or subtract for each other size. Negative values reduce price or time.
        </p>
      </div>

      {/* Unified table */}
      <div className="rounded-xl border border-[#D4D1CA] bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D4D1CA] bg-[#F7F6F2]">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 w-28">Size</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500">Example vehicles</th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 w-36">Display name</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500 w-36">Price (£)</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500 w-36">Time (mins)</th>
              {hasBase && (
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500 w-28">Effective</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EFE9]">
            {rows.map((row) => {
              const isLarge = row.size === "LARGE";
              const meta = SIZE_META[row.size] ?? { example: "" };
              const effectivePrice = hasBase
                ? (largeRow!.basePricePence! + row.deltaPricePence) / 100
                : null;
              const effectiveMins = hasBase
                ? largeRow!.baseAllocMins! + row.deltaMins
                : null;

              return (
                <tr
                  key={row.size}
                  className={isLarge ? "bg-[#E8650A]/5" : "bg-white hover:bg-[#F7F6F2]/60"}
                >
                  {/* Size badge */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isLarge && (
                        <span className="inline-flex rounded-full bg-[#E8650A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          Base
                        </span>
                      )}
                      {!isLarge && (
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {row.size}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Example */}
                  <td className="px-4 py-3 text-slate-500">{meta.example}</td>

                  {/* Label */}
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateRow(row.size, { label: e.target.value })}
                      className={cellInput}
                    />
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3">
                    {isLarge ? (
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">£</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.basePricePence != null ? (row.basePricePence / 100).toFixed(2) : ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            updateRow("LARGE", { basePricePence: isNaN(v) ? null : Math.round(v * 100) });
                          }}
                          placeholder="e.g. 20.00"
                          className={`${cellInput} pl-7 text-right`}
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={row.deltaPricePence !== 0 ? (row.deltaPricePence / 100).toFixed(2) : ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            updateRow(row.size, { deltaPricePence: isNaN(v) ? 0 : Math.round(v * 100) });
                          }}
                          placeholder="e.g. -5.00"
                          className={`${cellInput} text-right`}
                        />
                        <p className="mt-0.5 text-[10px] text-slate-400 text-right">delta from Large</p>
                      </div>
                    )}
                  </td>

                  {/* Time */}
                  <td className="px-4 py-3">
                    {isLarge ? (
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={row.baseAllocMins ?? ""}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          updateRow("LARGE", { baseAllocMins: isNaN(v) ? null : v });
                        }}
                        placeholder="e.g. 60"
                        className={`${cellInput} text-right`}
                      />
                    ) : (
                      <div>
                        <input
                          type="number"
                          step="1"
                          value={row.deltaMins !== 0 ? row.deltaMins : ""}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            updateRow(row.size, { deltaMins: isNaN(v) ? 0 : v });
                          }}
                          placeholder="e.g. -10"
                          className={`${cellInput} text-right`}
                        />
                        <p className="mt-0.5 text-[10px] text-slate-400 text-right">delta from Large</p>
                      </div>
                    )}
                  </td>

                  {/* Effective (only shown when base is set) */}
                  {hasBase && (
                    <td className="px-4 py-3 text-right">
                      <p className="font-semibold text-[#28251D]">
                        £{effectivePrice!.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-400">{effectiveMins} mins</p>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saveAll.isPending}
          className="flex h-9 items-center gap-2 rounded-lg bg-[#E8650A] px-5 text-sm font-semibold text-white transition hover:bg-[#d05a08] disabled:opacity-60"
        >
          {saveAll.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Vehicle Sizes
        </button>
        {saved && (
          <span className="text-sm font-semibold text-emerald-600">✓ Saved</span>
        )}
        {saveAll.error && (
          <span className="text-sm text-red-600">{saveAll.error.message}</span>
        )}
      </div>
    </div>
  );
}
