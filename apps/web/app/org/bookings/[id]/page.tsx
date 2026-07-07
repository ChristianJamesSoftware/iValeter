import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { getServerApi } from "@/lib/trpc/server";
import { formatTime } from "@/lib/utils";
import { JobStatusBadge } from "@/components/brand/job-status-badge";
import { PriorityBadge } from "@/components/brand/priority-badge";
import {
  MapPin,
  Ban,
  User,
  Car,
  Clock,
  Building2,
  CalendarDays,
  Layers,
  Star,
  ClipboardList,
  History,
} from "lucide-react";

export const dynamic = "force-dynamic";

function Detail({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-900">{value || "—"}</p>
      </div>
    </div>
  );
}

export default async function OrgBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await getServerApi();

  let booking;
  let photos: { id: string; url: string; label: string | null }[] = [];

  try {
    booking = await api.bookings.getById({ id });
    photos = await api.bookings.getPhotos({ bookingId: id });
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const vehicleDesc = [booking.vehicleColour, booking.vehicleMake, booking.vehicleModel]
    .filter(Boolean)
    .join(" ");

  const addOns = [
    booking.paintProtectionTier || (booking.paintProtectionProductId ? "Paint Protection" : null),
    booking.includeFreshScent ? "CSI Fresh Scent" : null,
    booking.includeInspection ? "Pre-valet Inspection" : null,
    booking.photographyPackage ? `Photography (${booking.photographyPackage})` : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl py-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl font-black tracking-tight text-slate-900">
          {booking.vehicleReg}
        </h1>
        <JobStatusBadge status={booking.status} />
        {booking.isPriority && <PriorityBadge />}
        {(booking.rollCount ?? 0) > 0 && (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
            Rolled ×{booking.rollCount}
          </span>
        )}
      </div>

      {/* DO NOT CLEAN */}
      {booking.doNotClean && (
        <div className="mb-5 flex items-center gap-3 rounded-xl bg-red-600 px-5 py-4">
          <Ban className="h-5 w-5 shrink-0 text-white" />
          <p className="font-heading text-sm font-bold uppercase tracking-widest text-white">
            DO NOT CLEAN THIS VEHICLE
          </p>
          <Ban className="h-5 w-5 shrink-0 text-white" />
        </div>
      )}

      {/* Core details */}
      <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Job Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail icon={User}        label="Customer"    value={booking.customerName} />
          <Detail icon={Car}         label="Vehicle"     value={vehicleDesc || "—"} />
          <Detail icon={Clock}       label="Ready by"    value={formatTime(booking.readyByTime)} />
          <Detail icon={Building2}   label="Site"        value={booking.site.name} />
          <Detail icon={Layers}      label="Department"  value={booking.department.name} />
          <Detail icon={ClipboardList} label="Service"   value={booking.serviceType.name} />
          {booking.vehicleSize && (
            <Detail icon={Car} label="Vehicle Size" value={booking.vehicleSize} />
          )}
          {booking.keyNumber && (
            <Detail icon={Car} label="Key Number" value={booking.keyNumber} />
          )}
          {booking.vehicleLocation && (
            <Detail icon={MapPin} label="Vehicle Location" value={booking.vehicleLocation} />
          )}
          {booking.assignedTo && (
            <Detail
              icon={User}
              label="Assigned Valeter"
              value={`${booking.assignedTo.firstName} ${booking.assignedTo.lastName}`}
            />
          )}
          {booking.createdBy && (
            <Detail
              icon={User}
              label="Booked by"
              value={`${booking.createdBy.firstName} ${booking.createdBy.lastName}`}
            />
          )}
          <Detail
            icon={CalendarDays}
            label="Created"
            value={new Date(booking.createdAt).toLocaleDateString("en-GB", {
              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          />
          {booking.completedAt && (
            <Detail
              icon={CalendarDays}
              label="Completed"
              value={new Date(booking.completedAt).toLocaleDateString("en-GB", {
                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            />
          )}
          {booking.budgetLimit != null && (
            <Detail icon={Star} label="Budget Limit" value={`£${booking.budgetLimit.toFixed(2)}`} />
          )}
        </div>
      </section>

      {/* Add-ons */}
      {addOns.length > 0 && (
        <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Add-Ons</h2>
          <div className="flex flex-wrap gap-2">
            {addOns.map((a) => (
              <span key={a as string} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {a}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Quality score */}
      {booking.qualityScore != null && (
        <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Quality Score</h2>
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`h-5 w-5 ${i < (booking.qualityScore ?? 0) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
              />
            ))}
            <span className="ml-1 text-sm font-semibold text-slate-700">{booking.qualityScore}/5</span>
          </div>
          {booking.qualityNote && (
            <p className="mt-2 text-sm italic text-slate-600">"{booking.qualityNote}"</p>
          )}
        </section>
      )}

      {/* Customer review note */}
      {booking.customerReviewNote && (
        <section className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-600">Customer Note</h2>
          <p className="text-sm text-slate-800">"{booking.customerReviewNote}"</p>
        </section>
      )}

      {/* Parking location */}
      {booking.parkingLat != null && booking.parkingLng != null && (
        <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Parking Location</h2>
          <a
            href={`https://maps.google.com/?q=${booking.parkingLat},${booking.parkingLng}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
          >
            <MapPin className="h-4 w-4" /> View on Google Maps
          </a>
        </section>
      )}

      {/* Status history */}
      {booking.statusHistory && booking.statusHistory.length > 0 && (
        <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            <History className="mr-1.5 inline h-3.5 w-3.5" />
            Status History
          </h2>
          <ol className="space-y-2">
            {booking.statusHistory.map((h) => (
              <li key={h.id} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-orange-400" />
                <div>
                  <span className="font-semibold text-slate-700">{h.fromStatus} → {h.toStatus}</span>
                  <span className="ml-2 text-slate-400 text-xs">
                    {h.user.firstName} {h.user.lastName} ·{" "}
                    {new Date(h.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{" "}
                    {new Date(h.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                  </span>
                  {h.note && <p className="mt-0.5 text-xs italic text-slate-400">"{h.note}"</p>}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Photos */}
      {photos.length > 0 && (
        <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Photos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noreferrer"
                className="overflow-hidden rounded-xl border border-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.label ?? "Vehicle photo"}
                  className="aspect-square w-full object-cover hover:opacity-90 transition-opacity" />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
