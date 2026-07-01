"use client";

import { useState } from "react";
import { Loader2, Save, RotateCcw, Info } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SizeKey = "pctSmall" | "pctMedium" | "pctLarge" | "pctXL" | "pctVan";

const SIZE_COLS: { key: SizeKey; label: string; hint: string }[] = [
  { key: "pctSmall", label: "Small", hint: "e.g. Hatchback" },
  { key: "pctMedium", label: "Medium", hint: "Baseline (0%)" },
  { key: "pctLarge", label: "Large", hint: "e.g. Estate / SUV" },
  { key: "pctXL", label: "XL", hint: "e.g. Large SUV" },
  { key: "pctVan", label: "Van", hint: "e.g. Transit / Sprinter" },
];

const DEFAULTS: Record<SizeKey, number> = {
  pctSmall: -10,
  pctMedium: 0,
  pctLarge: 20,
  pctXL: 35,
  pctVan: 50,
};

interface RateRow {
  serviceTypeId: string;
  serviceTypeName: string;
  chargeRate: number | null;
  durationMins: number;
  // From DB or local state
  basePricePence: number | null;
  baseAllocMins: number | null;
  pctSmall: number;
  pctMedium: number;
  pctLarge: number;
  pctXL: number;
  pctVan: number;
  isDirty: boolean;
  isSaving: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pence(p: number | null, fallbackRate: number | null) {
  const base = p ?? (fallbackRate != null ? Math.round(fallbackRate * 100) : null);
  if (base == null) return "—";
  return `£${(base / 100).toFixed(2)}`;
}

function withPct(base: number | null, pct: number) {
  if (base == null) return "—";
  return `£${((base / 100) * (1 + pct / 100)).toFixed(2)}`;
}

function minsWithPct(base: number, pct: number) {
  return `${Math.round(base * (1 + pct / 100))}m`;
}

// ─── Row component ────────────────────────────────────────────────────────────

function RateMatrixRow({
  row,
  onFieldChange,
  onSave,
  onReset,
}: {
  row: RateRow;
  onFieldChange: (field: keyof RateRow, value: number | null) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const basePence =
    row.basePricePence ?? (row.chargeRate != null ? Math.round(row.chargeRate * 100) : null);
  const baseAllocMins = row.baseAllocMins ?? row.durationMins;

  return (
    <tr className={cn("border-b border-[#F7F6F2] transition-colors", row.isDirty && "bg-[#F7F6F2]")}>
      {/* Service type */}
      <td className="py-3 pl-4 pr-2 text-sm font-medium text-[#28251D] min-w-[140px]">
        {row.serviceTypeName}
      </td>

      {/* Base price override */}
      <td className="py-3 px-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-[#7A7974]">£</span>
          <input
            type="number"
            min={0}
            step={0.01}
            placeholder={row.chargeRate?.toFixed(2) ?? "—"}
            value={row.basePricePence != null ? (row.basePricePence / 100).toFixed(2) : ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onFieldChange("basePricePence", isNaN(v) ? null : Math.round(v * 100));
            }}
            className="w-20 rounded border border-[#D4D1CA] bg-white px-2 py-1 text-xs text-[#28251D] focus:outline-none focus:ring-1 focus:ring-[#01696F]"
          />
        </div>
        <p className="text-[10px] text-[#BAB9B4] mt-0.5">Medium base</p>
      </td>

      {/* Base alloc mins override */}
      <td className="py-3 px-2">
        <input
          type="number"
          min={1}
          step={1}
          placeholder={String(row.durationMins)}
          value={row.baseAllocMins ?? ""}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            onFieldChange("baseAllocMins", isNaN(v) ? null : v);
          }}
          className="w-16 rounded border border-[#D4D1CA] bg-white px-2 py-1 text-xs text-[#28251D] focus:outline-none focus:ring-1 focus:ring-[#01696F]"
        />
        <p className="text-[10px] text-[#BAB9B4] mt-0.5">mins base</p>
      </td>

      {/* Size % columns */}
      {SIZE_COLS.map((col) => {
        const pct = row[col.key] as number;
        const isBaseline = col.key === "pctMedium";
        return (
          <td key={col.key} className="py-3 px-2 text-center">
            {isBaseline ? (
              <div className="flex flex-col items-center">
                <span className="text-xs text-[#BAB9B4]">0%</span>
                <span className="text-[10px] text-[#BAB9B4] mt-0.5">baseline</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-0.5">
                  <span className="text-xs text-[#7A7974]">+</span>
                  <input
                    type="number"
                    step={5}
                    value={pct}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v)) onFieldChange(col.key, v);
                    }}
                    className="w-14 rounded border border-[#D4D1CA] bg-white px-1.5 py-0.5 text-xs text-center text-[#28251D] focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                  />
                  <span className="text-xs text-[#7A7974]">%</span>
                </div>
                {basePence != null && (
                  <span className="text-[10px] text-[#7A7974]">{withPct(basePence, pct)}</span>
                )}
                <span className="text-[10px] text-[#BAB9B4]">
                  {minsWithPct(baseAllocMins, pct)}
                </span>
              </div>
            )}
          </td>
        );
      })}

      {/* Actions */}
      <td className="py-3 pl-2 pr-4">
        <div className="flex items-center gap-2">
          {row.isDirty && (
            <>
              <button
                onClick={onSave}
                disabled={row.isSaving}
                className="flex items-center gap-1 rounded-md bg-[#01696F] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#0C4E54] disabled:opacity-60 transition-colors"
              >
                {row.isSaving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Save className="w-3 h-3" />
                )}
                Save
              </button>
              <button
                onClick={onReset}
                className="rounded-md border border-[#D4D1CA] px-2 py-1 text-xs text-[#7A7974] hover:bg-[#F7F6F2] transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function VehicleSizeRatesManager({ siteId }: { siteId: string }) {
  const utils = trpc.useUtils();

  const serviceTypesQuery = trpc.vehicleSizeRates.listServiceTypes.useQuery({ siteId });
  const ratesQuery = trpc.vehicleSizeRates.listBySite.useQuery({ siteId });
  const upsertMutation = trpc.vehicleSizeRates.upsert.useMutation({
    onSuccess: () => utils.vehicleSizeRates.listBySite.invalidate({ siteId }),
  });

  // Build local row state from service types + existing rates
  const [localRows, setLocalRows] = useState<Record<string, Partial<RateRow>>>({});

  const serviceTypes = serviceTypesQuery.data ?? [];
  const existingRates = ratesQuery.data ?? [];

  if (serviceTypesQuery.isLoading || ratesQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-[#7A7974]">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        <span className="text-sm">Loading rates…</span>
      </div>
    );
  }

  if (serviceTypes.length === 0) {
    return (
      <p className="text-sm text-[#7A7974] py-4">
        No active service types found for this site. Add service types in the site settings first.
      </p>
    );
  }

  const rows: RateRow[] = serviceTypes.map((st) => {
    const existing = existingRates.find((r) => r.serviceTypeId === st.id);
    const local = localRows[st.id] ?? {};

    return {
      serviceTypeId: st.id,
      serviceTypeName: st.name,
      chargeRate: st.chargeRate,
      durationMins: st.durationMins,
      basePricePence:
        "basePricePence" in local
          ? (local.basePricePence ?? null)
          : (existing?.basePricePence ?? null),
      baseAllocMins:
        "baseAllocMins" in local
          ? (local.baseAllocMins ?? null)
          : (existing?.baseAllocMins ?? null),
      pctSmall: local.pctSmall ?? existing?.pctSmall ?? DEFAULTS.pctSmall,
      pctMedium: 0,
      pctLarge: local.pctLarge ?? existing?.pctLarge ?? DEFAULTS.pctLarge,
      pctXL: local.pctXL ?? existing?.pctXL ?? DEFAULTS.pctXL,
      pctVan: local.pctVan ?? existing?.pctVan ?? DEFAULTS.pctVan,
      isDirty: !!localRows[st.id] && Object.keys(localRows[st.id]!).length > 0,
      isSaving: upsertMutation.isPending,
    };
  });

  function handleFieldChange(stId: string, field: keyof RateRow, value: number | null) {
    setLocalRows((prev) => ({
      ...prev,
      [stId]: { ...(prev[stId] ?? {}), [field]: value },
    }));
  }

  function handleSave(row: RateRow) {
    upsertMutation.mutate({
      siteId,
      serviceTypeId: row.serviceTypeId,
      basePricePence: row.basePricePence,
      baseAllocMins: row.baseAllocMins,
      pctSmall: row.pctSmall,
      pctMedium: 0,
      pctLarge: row.pctLarge,
      pctXL: row.pctXL,
      pctVan: row.pctVan,
    }, {
      onSuccess: () => {
        setLocalRows((prev) => {
          const next = { ...prev };
          delete next[row.serviceTypeId];
          return next;
        });
      },
    });
  }

  function handleReset(stId: string) {
    setLocalRows((prev) => {
      const next = { ...prev };
      delete next[stId];
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-[#D4D1CA] bg-[#F9F8F5] p-3">
        <Info className="w-4 h-4 text-[#01696F] shrink-0 mt-0.5" />
        <div className="text-xs text-[#7A7974]">
          <span className="font-medium text-[#28251D]">Medium is the baseline (0%).</span>{" "}
          Set a base price and allocation time for Medium, then adjust the percentage uplift for
          each other size. Prices and time are calculated automatically. Leave base fields blank
          to use the service type defaults.
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[#D4D1CA]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F7F6F2] border-b border-[#D4D1CA]">
              <th className="py-2.5 pl-4 pr-2 text-xs font-semibold text-[#7A7974]">
                Service Type
              </th>
              <th className="py-2.5 px-2 text-xs font-semibold text-[#7A7974]">Base Price</th>
              <th className="py-2.5 px-2 text-xs font-semibold text-[#7A7974]">Base Mins</th>
              {SIZE_COLS.map((col) => (
                <th
                  key={col.key}
                  className="py-2.5 px-2 text-xs font-semibold text-[#7A7974] text-center"
                >
                  <div>{col.label}</div>
                  <div className="text-[10px] font-normal text-[#BAB9B4]">{col.hint}</div>
                </th>
              ))}
              <th className="py-2.5 pl-2 pr-4 text-xs font-semibold text-[#7A7974]" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <RateMatrixRow
                key={row.serviceTypeId}
                row={row}
                onFieldChange={(field, value) => handleFieldChange(row.serviceTypeId, field, value)}
                onSave={() => handleSave(row)}
                onReset={() => handleReset(row.serviceTypeId)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
