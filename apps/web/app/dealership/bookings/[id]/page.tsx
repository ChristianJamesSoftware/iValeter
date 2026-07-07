import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Ban } from "lucide-react";
import { TRPCError } from "@trpc/server";
import { getServerApi } from "@/lib/trpc/server";
import { formatTime } from "@/lib/utils";
import { JobStatusBadge } from "@/components/brand/job-status-badge";
import { QualityRating } from "@/components/dealership/quality-rating";

export const dynamic = "force-dynamic";

export default async function DealershipBookingDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const { from } = await searchParams;
  const fromCalendar = from === "calendar";
  const fromDashboard = from === "dashboard";
  const api = await getServerApi();

  let booking;
  let photos;
  try {
    booking = await api.bookings.getById({ id });
    photos = await api.bookings.getPhotos({ bookingId: id });
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  return (
    <div>
      <Link
        href={fromCalendar ? "/dealership/calendar" : fromDashboard ? "/dealership" : "/dealership/bookings"}
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> {fromCalendar ? "Back to calendar" : fromDashboard ? "Back to dashboard" : "All bookings"}
      </Link>

      {/* DO NOT CLEAN alert */}
      {booking.doNotClean && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-600 px-5 py-4">
          <Ban className="h-6 w-6 shrink-0 text-white" />
          <p className="flex-1 font-heading text-sm font-bold uppercase tracking-widest text-white">
            DO NOT CLEAN THIS VEHICLE
          </p>
          <Ban className="h-6 w-6 shrink-0 text-white" />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl font-bold text-navy">
          {booking.vehicleReg}
        </h1>
        <JobStatusBadge status={booking.status} />
        {(booking.rollCount ?? 0) > 0 && (
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-700">
            Rolled ×{booking.rollCount}
          </span>
        )}
      </div>

      <section className="mb-6 grid gap-4 rounded-xl border border-line bg-white p-5 sm:grid-cols-2">
        <Detail label="Customer" value={booking.customerName} />
        <Detail
          label="Vehicle"
          value={
            [booking.vehicleColour, booking.vehicleMake, booking.vehicleModel]
              .filter(Boolean)
              .join(" ") || "—"
          }
        />
        <Detail label="Ready by" value={formatTime(booking.readyByTime)} />
        <Detail label="Site" value={booking.site.name} />
        <Detail label="Department" value={booking.department.name} />
        {booking.createdBy && (
          <Detail
            label="Booked by"
            value={`${booking.createdBy.firstName} ${booking.createdBy.lastName}`}
          />
        )}
        {booking.parkingLat != null && booking.parkingLng != null && (
          <div className="sm:col-span-2">
            <p className="text-xs uppercase tracking-wide text-slate">Parking Location</p>
            <a
              href={`https://maps.google.com/?q=${booking.parkingLat},${booking.parkingLng}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-sm text-cyan-600 hover:underline mt-0.5 font-medium"
            >
              <MapPin className="h-4 w-4" /> View parking location
            </a>
          </div>
        )}
      </section>

      <QualityRating
        bookingId={booking.id}
        currentScore={booking.qualityScore ?? null}
        currentNote={booking.qualityNote ?? null}
        status={booking.status}
      />

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold text-navy">
          Photography
        </h2>
        {photos.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-5 text-slate">
            No photography available for this booking yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {photos.map((p) => (
              <div
                key={p.id}
                className="overflow-hidden rounded-xl border border-line bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt={p.label ?? "Vehicle photo"}
                  className="aspect-square w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate">{label}</p>
      <p className="font-medium text-navy">{value}</p>
    </div>
  );
}
