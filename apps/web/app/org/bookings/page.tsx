"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Loader2, Plus, Search, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_COLOURS: Record<string, string> = {
  PENDING:     "bg-amber-100 text-amber-800",
  ASSIGNED:    "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-cyan-100 text-cyan-800",
  COMPLETED:   "bg-emerald-100 text-emerald-800",
  CANCELLED:   "bg-red-100 text-red-800",
};

export default function OrgBookingsPage() {
  const router = useRouter();
  const [search, setSearch]   = useState("");
  const [status, setStatus]   = useState("");
  const [siteId, setSiteId]   = useState("");

  const sitesQuery    = trpc.sites.list.useQuery();
  const bookingsQuery = trpc.bookings.list.useQuery({
    search:  search.trim() || undefined,
    status:  (status as never) || undefined,
    siteId:  siteId || undefined,
  });

  const sites    = sitesQuery.data    ?? [];
  const bookings = bookingsQuery.data ?? [];

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="All bookings across your sites"
      />

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search reg or customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </div>

        {/* Status filter */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Site filter */}
        {sites.length > 1 && (
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="h-9 rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          >
            <option value="">All Sites</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}

        {/* New booking */}
        <button
          onClick={() => router.push("/org/bookings/new")}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy/90"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </button>
      </div>

      {/* Loading */}
      {bookingsQuery.isLoading && (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )}

      {/* Error */}
      {bookingsQuery.isError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">Failed to load bookings — {bookingsQuery.error?.message ?? "please refresh."}</p>
        </div>
      )}

      {/* Empty */}
      {!bookingsQuery.isLoading && !bookingsQuery.isError && bookings.length === 0 && (
        <div className="rounded-xl border border-line bg-white py-16 text-center">
          <p className="text-slate">No bookings found.</p>
          {(search || status || siteId) && (
            <p className="mt-1 text-sm text-slate">Try clearing your filters.</p>
          )}
        </div>
      )}

      {/* Table */}
      {bookings.length > 0 && (
        <div className="rounded-xl border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line bg-offwhite text-xs uppercase tracking-wide text-slate">
                <tr>
                  <th className="px-5 py-3 text-left">Reg</th>
                  <th className="px-5 py-3 text-left">Customer</th>
                  <th className="px-5 py-3 text-left">Site</th>
                  <th className="px-5 py-3 text-left">Service</th>
                  <th className="px-5 py-3 text-left">Ready By</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Assigned</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr
                    key={b.id}
                    onClick={() => router.push(`/org/bookings/${b.id}`)}
                    className="cursor-pointer border-b border-line transition hover:bg-offwhite last:border-0"
                  >
                    <td className="px-5 py-3 font-mono font-semibold text-navy">
                      {b.isPriority && (
                        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" title="Priority" />
                      )}
                      {b.vehicleReg}
                    </td>
                    <td className="px-5 py-3 text-slate">{b.customerName ?? "—"}</td>
                    <td className="px-5 py-3 text-slate">{b.site?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-slate">{b.serviceType?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-slate">
                      {new Date(b.readyByTime).toLocaleDateString("en-GB", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        STATUS_COLOURS[b.status] ?? "bg-slate-100 text-slate-700",
                      )}>
                        {b.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate">
                      {b.assignedTo
                        ? `${b.assignedTo.firstName} ${b.assignedTo.lastName}`
                        : <span className="text-slate-300">Unassigned</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-5 py-3 text-xs text-slate">
            {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
