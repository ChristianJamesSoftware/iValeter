"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Star } from "lucide-react";
import { BookingStatus } from "@ivaleter/db";
import { trpc } from "@/lib/trpc/react";
import { formatDateTime, formatTime, cn } from "@/lib/utils";
import { JobStatusBadge } from "@/components/brand/job-status-badge";
import { EditBookingModal } from "@/components/dealership/edit-booking-modal";

const STATUS_OPTIONS: (BookingStatus | "ALL")[] = [
  "ALL",
  "PENDING",
  "ASSIGNED",
  "IN_PROGRESS",
  "QC_CHECK",
  "COMPLETED",
];

const EDITABLE_STATUSES: BookingStatus[] = [
  BookingStatus.PENDING,
  BookingStatus.ASSIGNED,
];

type BookingRow = {
  id: string;
  vehicleReg: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColour: string | null;
  customerName: string;
  readyByTime: Date;
  keyNumber: string | null;
  vehicleLocation: string | null;
  status: BookingStatus;
  serviceType: { id: string; name: string };
  department: { id: string; name: string } | null;
  site: { id: string; name: string };
  assignedTo: { firstName: string; lastName: string } | null;
  createdAt: Date;
  qualityScore?: number | null;
};

function StarRow({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "h-3.5 w-3.5",
            n <= score
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-slate-200",
          )}
        />
      ))}
    </div>
  );
}

export function BookingHistory() {
  const [status, setStatus] = useState<BookingStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [editBooking, setEditBooking] = useState<BookingRow | null>(null);

  const query = trpc.bookings.list.useQuery({
    status: status === "ALL" ? undefined : status,
    search: search.trim() || undefined,
  });

  // Load departments for the site when edit modal is open
  const sitesQuery = trpc.sites.list.useQuery(undefined, {
    enabled: editBooking !== null,
  });
  const editSite = sitesQuery.data?.find((s) => s.id === editBooking?.site?.id);
  const editDepartments =
    editSite?.departments.map((d) => ({
      id: d.id,
      name: d.name,
      serviceTypes: d.serviceTypes.map((st) => ({
        id: st.id,
        name: st.name,
        durationMins: st.durationMins,
      })),
    })) ?? [];

  function handleEdit(b: BookingRow) {
    setEditBooking(b);
  }

  function handleModalClose() {
    setEditBooking(null);
  }

  function handleModalSaved() {
    setEditBooking(null);
    query.refetch();
  }

  return (
    <div>
      {/* Filters */}
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

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[780px] text-left text-sm">
          <thead className="border-b border-line bg-offwhite text-xs uppercase text-slate">
            <tr>
              <th className="px-4 py-3">Reg</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Ready By</th>
              <th className="px-4 py-3">Valeter</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 sr-only">Edit</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate">
                  Loading…
                </td>
              </tr>
            ) : !query.data || query.data.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate">
                  No bookings found.
                </td>
              </tr>
            ) : (
              query.data.map((b) => {
                const canEdit = EDITABLE_STATUSES.includes(b.status);
                return (
                  <tr key={b.id} className="border-b border-line last:border-0 hover:bg-offwhite/50 transition-colors">
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
                    <td className="px-4 py-3">
                      {b.status === "COMPLETED" && (b as unknown as BookingRow).qualityScore != null ? (
                        <StarRow score={(b as unknown as BookingRow).qualityScore!} />
                      ) : b.status === "COMPLETED" ? (
                        <span className="text-xs text-slate-300">—</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate">
                      {formatDateTime(b.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(b as unknown as BookingRow)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-medium text-slate transition hover:border-navy hover:text-navy"
                          title="Edit booking"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editBooking && editDepartments.length > 0 && (
        <EditBookingModal
          booking={{
            ...editBooking,
            readyByTime: editBooking.readyByTime.toISOString(),
            siteId: editBooking.site.id,
          }}
          departments={editDepartments}
          onClose={handleModalClose}
          onSaved={handleModalSaved}
        />
      )}
    </div>
  );
}
