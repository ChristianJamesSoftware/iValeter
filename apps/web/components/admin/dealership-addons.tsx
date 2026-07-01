"use client";

import { trpc } from "@/lib/trpc/react";
import { Toggle } from "@/components/settings/toggle";
import { Beaker } from "lucide-react";

export function DealershipAddOns({ dealershipId }: { dealershipId: string }) {
  const utils = trpc.useUtils();
  const { data: addOns = [], isLoading } = trpc.addOns.getForDealership.useQuery(
    { dealershipId },
  );

  const setAddOn = trpc.addOns.setForDealership.useMutation({
    onSuccess: () => utils.addOns.getForDealership.invalidate({ dealershipId }),
  });

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
        <h2 className="text-base font-bold text-slate-900">
          CSI Sensory Add-Ons
        </h2>
        <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {addOns.filter((a) => a.enabled).length} / {addOns.length} enabled
        </span>
      </div>

      <ul className="divide-y divide-slate-50">
        {addOns.map((addon) => (
          <li
            key={addon.id}
            className="flex items-center justify-between gap-4 px-5 py-4"
          >
            <div className="min-w-0">
              <p className="font-medium text-slate-900">{addon.name}</p>
              {addon.description && (
                <p className="mt-0.5 text-sm text-slate-500">{addon.description}</p>
              )}
            </div>
            <Toggle
              checked={addon.enabled}
              disabled={setAddOn.isPending}
              onChange={(enabled) =>
                setAddOn.mutate({ dealershipId, addOnId: addon.id, enabled })
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
