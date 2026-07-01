"use client";

import { useState } from "react";
import { Power } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import { ValeterCardModal } from "./valeter-card-modal";

function fmtDate(d: string | Date | null): string {
  if (!d) return "\u2014";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "\u2014";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function AdminTeamList() {
  const [showInactive, setShowInactive] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const query = trpc.users.listAllValeters.useQuery({ showInactive });
  const toggleActive = trpc.users.update.useMutation({
    onSuccess: () => utils.users.listAllValeters.invalidate(),
  });

  if (query.isLoading) return <p className="text-slate-400">Loading\u2026</p>;
  const valeters = query.data ?? [];

  return (
    <>
      {selectedId && (
        <ValeterCardModal
          valeterUid={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Valeting Team
            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
              {valeters.length}
            </span>
          </h2>

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
        </div>

        {valeters.length === 0 ? (
          <p className="px-5 py-16 text-center text-sm text-slate-400">No valeters found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Name</th>
                  <th className={TH}>Site</th>
                  <th className={TH}>Organisation</th>
                  <th className={TH}>Pay ID</th>
                  <th className={TH}>Daily Rate</th>
                  <th className={TH}>Start Date</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {valeters.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => setSelectedId(v.id)}
                    className={cn(
                      "cursor-pointer border-b border-slate-50 last:border-0 transition hover:bg-slate-50",
                      !v.isActive && "opacity-50",
                    )}
                  >
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {v.firstName} {v.lastName}
                      <span className="block text-xs font-normal text-slate-400">{v.email}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{v.site?.name ?? "\u2014"}</td>
                    <td className="px-5 py-3.5 text-slate-600">{v.organisation.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{v.payId ?? "\u2014"}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {v.dailyRate != null ? `\u00a3${v.dailyRate}` : "\u2014"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{fmtDate(v.startDate)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className={v.isActive ? BADGE_ACTIVE : BADGE_INACTIVE}>
                          {v.isActive ? "Active" : "Inactive"}
                        </span>
                        <button
                          onClick={() => toggleActive.mutate({ id: v.id, isActive: !v.isActive })}
                          title={v.isActive ? "Deactivate" : "Reactivate"}
                          className={cn(
                            "rounded-lg p-1.5 transition hover:bg-slate-100",
                            v.isActive ? "text-red-400 hover:text-red-600" : "text-emerald-500 hover:text-emerald-700",
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
    </>
  );
}

const TH = "px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 text-left";
const BADGE_ACTIVE = "rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700";
const BADGE_INACTIVE = "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500";
