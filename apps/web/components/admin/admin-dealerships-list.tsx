"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/react";

export function AdminDealershipsList() {
  const query = trpc.dealerships.listAll.useQuery();

  if (query.isLoading) return <p className="text-slate-400">Loading…</p>;
  const dealerships = query.data ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">
          Dealerships
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {dealerships.length}
          </span>
        </h2>
      </div>

      {dealerships.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-slate-400">
          No dealerships yet. Add them from a{" "}
          <Link href="/admin/organisations" className="font-semibold text-cyan underline-offset-2 hover:underline">
            Head Office
          </Link>.
        </p>
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
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
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
                    <span className={d.isActive ? BADGE_ACTIVE : BADGE_INACTIVE}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
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
