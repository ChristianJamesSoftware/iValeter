"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/react";

export function OrganisationsList() {
  const query = trpc.organisations.list.useQuery();

  if (query.isLoading) {
    return <p className="text-slate">Loading…</p>;
  }
  const orgs = query.data ?? [];
  if (orgs.length === 0) {
    return <p className="text-slate">No organisations yet.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line bg-offwhite text-xs uppercase text-slate">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Sites</th>
            <th className="px-4 py-3">Users</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => (
            <tr key={o.id} className="border-b border-line last:border-0">
              <td className="px-4 py-3 font-heading font-bold">
                <Link
                  href={`/admin/organisations/${o.id}`}
                  className="text-navy underline-offset-2 hover:text-cyan-600 hover:underline"
                >
                  {o.name}
                </Link>
                <span className="ml-2 font-sans text-xs font-normal text-slate">
                  {o.slug}
                </span>
              </td>
              <td className="px-4 py-3 capitalize text-slate">{o.plan}</td>
              <td className="px-4 py-3 text-slate">{o.sitesCount}</td>
              <td className="px-4 py-3 text-slate">{o.usersCount}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    o.isActive
                      ? "rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
                      : "rounded-full bg-line px-2.5 py-1 text-xs font-semibold text-slate"
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
  );
}
