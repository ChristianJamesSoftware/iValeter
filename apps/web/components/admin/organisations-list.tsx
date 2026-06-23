"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/react";

export function OrganisationsList() {
  const query = trpc.organisations.list.useQuery();

  if (query.isLoading) {
    return <p className="text-slate-400">Loading…</p>;
  }
  const orgs = query.data ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">
          Organisations
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {orgs.length}
          </span>
        </h2>
      </div>
      {orgs.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-slate-400">
          No organisations yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Name
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Plan
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Sites
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Users
                </th>
                <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {orgs.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50"
                >
                  <td className="px-5 py-4 font-bold text-slate-900">
                    <Link
                      href={`/admin/organisations/${o.id}`}
                      className="underline-offset-2 hover:text-orange-500 hover:underline"
                    >
                      {o.name}
                    </Link>
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {o.slug}
                    </span>
                  </td>
                  <td className="px-5 py-4 capitalize text-slate-600">
                    {o.plan}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{o.sitesCount}</td>
                  <td className="px-5 py-4 text-slate-600">{o.usersCount}</td>
                  <td className="px-5 py-4">
                    <span
                      className={
                        o.isActive
                          ? "rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700"
                          : "rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500"
                      }
                    >
                      {o.isActive ? "Active" : "Inactive"}
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
