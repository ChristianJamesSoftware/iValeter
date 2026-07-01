"use client";

import { useState } from "react";
import Link from "next/link";
import { Power, PlusCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { AddDealershipModal } from "@/components/admin/add-dealership-modal";

export function AdminDealershipsList() {
  const [showInactive, setShowInactive] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const utils = trpc.useUtils();
  const query = trpc.dealerships.listAll.useQuery({ showInactive });

  const toggleActive = trpc.dealerships.update.useMutation({
    onSuccess: () => utils.dealerships.listAll.invalidate(),
  });

  if (query.isLoading) return <p className="text-slate-400">Loading…</p>;
  const dealerships = query.data ?? [];
  const activeCount = dealerships.filter((d) => d.isActive).length;

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Dealerships
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {showInactive ? dealerships.length : activeCount}
            </span>
          </h2>

          <div className="flex items-center gap-3">
            {/* Active / All toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setShowInactive(false)}
                className={cn(
                  "rounded-md px-3 py-1.5 transition",
                  !showInactive ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700",
                )}
              >
                Active
              </button>
              <button
                onClick={() => setShowInactive(true)}
                className={cn(
                  "rounded-md px-3 py-1.5 transition",
                  showInactive ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700",
                )}
              >
                All
              </button>
            </div>

            {/* Add dealership */}
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <PlusCircle className="h-4 w-4" />
              Add dealership
            </button>
          </div>
        </div>

        {dealerships.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm text-slate-400">No dealerships yet.</p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              <PlusCircle className="h-4 w-4" /> Add first dealership
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Dealership</th>
                  <th className={TH}>Head Office</th>
                  <th className={TH}>Contact</th>
                  <th className={TH}>Sites</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {dealerships.map((d) => (
                  <tr
                    key={d.id}
                    className={cn(
                      "border-b border-slate-50 last:border-0 hover:bg-slate-50/50",
                      !d.isActive && "opacity-50",
                    )}
                  >
                    <td className="px-5 py-4 font-bold text-slate-900">
                      <Link
                        href={`/admin/dealerships/${d.id}`}
                        className="underline-offset-2 hover:text-cyan hover:underline"
                      >
                        {d.name}
                      </Link>
                      {d.address && (
                        <span className="block text-xs font-normal text-slate-400">
                          {d.address}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      <Link
                        href={`/admin/organisations/${d.organisation.id}`}
                        className="underline-offset-2 hover:text-cyan hover:underline"
                      >
                        {d.organisation.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {d.contactName ?? "—"}
                      {d.contactEmail && (
                        <span className="block text-xs text-slate-400">{d.contactEmail}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{d._count.sites}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={d.isActive ? BADGE_ACTIVE : BADGE_INACTIVE}>
                          {d.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => toggleActive.mutate({ id: d.id, isActive: !d.isActive })}
                          title={d.isActive ? "Deactivate" : "Reactivate"}
                          className={cn(
                            "rounded-lg p-1.5 transition hover:bg-slate-100",
                            d.isActive ? "text-red-400 hover:text-red-600" : "text-emerald-500 hover:text-emerald-700",
                          )}
                        >
                          <Power className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <AddDealershipModal
          onClose={() => {
            setShowModal(false);
            void utils.dealerships.listAll.invalidate();
          }}
        />
      )}
    </>
  );
}

const TH = "px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400";
const BADGE_ACTIVE = "rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700";
const BADGE_INACTIVE = "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500";
