"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/react";
import { Toggle } from "@/components/settings/toggle";
import { Beaker } from "lucide-react";

export function DealershipAddOns({ dealershipId }: { dealershipId: string }) {
  const utils = trpc.useUtils();
  const { data: addOns = [], isLoading } = trpc.addOns.getForDealership.useQuery(
    { dealershipId },
  );

  // Local price draft state: addOnId → string value while editing
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});

  const setAddOn = trpc.addOns.setForDealership.useMutation({
    onSuccess: () => utils.addOns.getForDealership.invalidate({ dealershipId }),
  });

  const setPrice = trpc.addOns.setPriceForDealership.useMutation({
    onSuccess: () => utils.addOns.getForDealership.invalidate({ dealershipId }),
  });

  function handleToggle(addOnId: string, enabled: boolean) {
    setAddOn.mutate({ dealershipId, addOnId, enabled });
  }

  function handlePriceBlur(addOnId: string) {
    const draft = priceDrafts[addOnId];
    if (draft === undefined) return;
    const parsed = parseFloat(draft);
    const priceGbp = isNaN(parsed) ? null : Math.max(0, parsed);
    setPrice.mutate({ dealershipId, addOnId, priceGbp });
    setPriceDrafts((prev) => {
      const next = { ...prev };
      delete next[addOnId];
      return next;
    });
  }

  function getPriceDisplay(addOnId: string, serverPrice: number | null): string {
    if (priceDrafts[addOnId] !== undefined) return priceDrafts[addOnId];
    return serverPrice !== null ? String(serverPrice) : "";
  }

  if (isLoading) {
    return (
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="px-5 py-4">
          <p className="text-sm text-slate-400">Loading add-ons…</p>
        </div>
      </div>
    );
  }

  if (addOns.length === 0) {
    return (
      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">CSI Sensory Add-Ons</h2>
        </div>
        <p className="px-5 py-10 text-center text-sm text-slate-400">
          No add-ons defined yet. Add them in{" "}
          <a href="/admin/settings" className="font-semibold text-cyan underline-offset-2 hover:underline">
            Platform Settings → Add-Ons
          </a>.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <Beaker className="h-4 w-4 text-cyan" />
        <h2 className="text-base font-bold text-slate-900">CSI Sensory Add-Ons</h2>
        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {addOns.filter((a) => a.enabled).length} / {addOns.length} enabled
        </span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-slate-50 px-5 py-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Add-On</span>
        <span className="w-28 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Price (£)</span>
        <span className="w-12 text-right text-xs font-medium uppercase tracking-wide text-slate-400">On</span>
      </div>

      <ul className="divide-y divide-slate-50">
        {addOns.map((addon) => (
          <li
            key={addon.id}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5"
          >
            {/* Name + description */}
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{addon.name}</p>
              {addon.description && (
                <p className="mt-0.5 text-sm text-slate-500">{addon.description}</p>
              )}
            </div>

            {/* Price input — always visible, greyed when disabled */}
            <div className="relative w-28">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                £
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder={addon.enabled ? "0.00" : "—"}
                disabled={!addon.enabled || setPrice.isPending}
                value={getPriceDisplay(addon.id, addon.priceGbp)}
                onChange={(e) =>
                  setPriceDrafts((prev) => ({ ...prev, [addon.id]: e.target.value }))
                }
                onBlur={() => handlePriceBlur(addon.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                }}
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-2 text-right text-sm font-medium text-slate-900 placeholder-slate-300 transition focus:border-cyan focus:outline-none focus:ring-1 focus:ring-cyan disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300"
              />
            </div>

            {/* Toggle */}
            <div className="flex w-12 justify-end">
              <Toggle
                checked={addon.enabled}
                disabled={setAddOn.isPending}
                onChange={(enabled) => handleToggle(addon.id, enabled)}
              />
            </div>
          </li>
        ))}
      </ul>

      <div className="border-t border-slate-50 px-5 py-3">
        <p className="text-xs text-slate-400">
          Set a price per add-on for this dealership. Leave blank or £0 if included at no extra charge.
        </p>
      </div>
    </div>
  );
}
