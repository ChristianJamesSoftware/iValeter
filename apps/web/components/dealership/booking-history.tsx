"use client";

import { useState } from "react";
import Link from "next/link";
import { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { formatDateTime, formatTime, cn } from "@/lib/utils";
import { JobStatusBadge } from "@/components/brand/job-status-badge";

const STATUS_OPTIONS: (BookingStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "QC_CHECK",
  "COMPLETED",
];

export function BookingHistory() {
  const [status, setStatus] = useState<BookingStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const query = trpc.bookings.list.useQuery({
    status: status === "ALL" ? undefined : status,
    search: search.trim() || undefined,
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reg or customer…"
          className="h-11 w-full max-w-xs rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        />
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                status === s
                  ? "bg-navy text-white"
                  : "border border-line bg-white text-slate",
              )}
            >
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-offwhite text-xs uppercase text-slate">
            <tr>
              <th className="px-4 py-3">Reg</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ready By</th>
              <th className="px-4 py-3">Valeter</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate">
                  Loading…
                </td>
              </tr>
            ) : !query.data || query.data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate">
                  No bookings found.
                </td>
              </tr>
            ) : (
              query.data.map((b) => (
                <tr key={b.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-heading font-bold">
                    <Link
                      href={`/dealership/bookings/${b.id}`}
                      className="text-navy underline-offset-2 hover:text-cyan-600 hover:underline"
                    >
                      {b.vehicleReg}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate">{b.customerName}</td>
                  <td className="px-4 py-3 text-slate">{b.serviceType.name}</td>
                  <td className="px-4 py-3">
                    <JobStatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-slate">
                    {formatTime(b.readyByTime)}
                  </td>
                  <td className="px-4 py-3 text-slate">
                    {b.assignedTo
                      ? `${b.assignedTo.firstName} ${b.assignedTo.lastName}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate">
                    {formatDateTime(b.createdAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
