"use client";

import { useState } from "react";
import Link from "next/link";
import { Power, Search } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

export function HeadOfficesList() {
  const [showInactive, setShowInactive] = useState(false);
  const [search, setSearch] = useState("");
  const utils = trpc.useUtils();
  const query = trpc.organisations.list.useQuery({ showInactive });

  const toggleActive = trpc.organisations.setActive.useMutation({
    onSuccess: () => utils.organisations.list.invalidate(),
  });

  if (query.isLoading) return <p className="text-slate-400">Loading…</p>;
  const orgs = query.data ?? [];
  const filtered = search.trim()
    ? orgs.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))
    : orgs;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">
          Head Offices
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {filtered.length}
          </span>
        </h2>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search head offices…"
              className="h-9 w-52 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100 placeholder:text-slate-400"
            />
          </div>
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
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-slate-400">
          {search.trim() ? `No head offices match "${search}"` : "No head offices yet."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className={TH}>Name</th>
                <th className={TH}>Dealerships</th>
                <th className={TH}>Contact</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr
                  key={o.id}
                  className={cn(
                    "border-b border-slate-50 last:border-0 hover:bg-slate-50/50",
                    !o.isActive && "opacity-50",
                  )}
                >
                  <td className="px-5 py-4 font-bold text-slate-900">
                    <Link
                      href={`/admin/organisations/${o.id}`}
                      className="underline-offset-2 hover:text-cyan hover:underline"
                    >
                      {o.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{o.sitesCount}</td>
                  <td className="px-5 py-4 text-slate-500">—</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span className={o.isActive ? BADGE_ACTIVE : BADGE_INACTIVE}>
                        {o.isActive ? "Active" : "Inactive"}
                      </span>
                      <button
                        onClick={() => toggleActive.mutate({ id: o.id, isActive: !o.isActive })}
                        title={o.isActive ? "Deactivate" : "Reactivate"}
                        className={cn(
                          "rounded-lg p-1.5 transition hover:bg-slate-100",
                          o.isActive ? "text-red-400 hover:text-red-600" : "text-emerald-500 hover:text-emerald-700",
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
  );
}

const TH = "px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400";
const BADGE_ACTIVE = "rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700";
const BADGE_INACTIVE = "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500";
