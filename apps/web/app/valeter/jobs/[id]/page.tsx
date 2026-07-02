import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  MapPin,
  Car,
  User,
  CheckCircle2,
  Sparkles,
  Droplets,
  Camera,
  Ban,
} from "lucide-react";
import { TRPCError } from "@trpc/server";
import { getServerApi } from "@/lib/trpc/server";
import { formatTime, minutesToHuman } from "@/lib/utils";
import { JobStatusBadge } from "@/components/brand/job-status-badge";
import { PriorityBadge } from "@/components/brand/priority-badge";
import { SLATimer } from "@/components/brand/sla-timer";
import { JobStatusAction } from "@/components/valeter/job-status-action";
import { JobPhotosClient } from "@/components/valeter/job-photos-client";
import { ParkingPinClient } from "@/components/valeter/parking-pin-client";

export const dynamic = "force-dynamic";

const TIER_NAMES: Record<string, string> = {
  essential: "Essential",
  standard: "Standard",
  premium: "Premium",
  ultimate: "Ultimate",
};

export default async function ValeterJobDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ inspected?: string }>;
}) {
  const { id } = await params;
  const { inspected } = await searchParams;
  const api = await getServerApi();

  let booking;
  try {
    booking = await api.bookings.getById({ id });
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  // Duration: use serviceType allocated time.
  // Do NOT calculate from createdAt — that measures booking age, not job duration.
  // Actual clock-based duration is available in the Valet Timings report.
  const allocatedMins = booking.serviceType.durationMins;

  return (
    <div>
      <header className="bg-navy px-4 pb-6 pt-6 text-white">
        <Link
          href="/valeter"
          className="mb-4 inline-flex items-center gap-1 text-sm text-white/70"
        >
          <ChevronLeft className="h-4 w-4" /> My Jobs
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="font-heading text-3xl font-bold tracking-wide">
            {booking.vehicleReg}
          </h1>
          {booking.isPriority && <PriorityBadge />}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <JobStatusBadge status={booking.status} />
          {booking.status !== "COMPLETED" && (
            <SLATimer
              readyByTime={booking.readyByTime}
              createdAt={booking.createdAt}
            />
          )}
        </div>
        {booking.doNotClean && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-red-500 bg-red-600 px-5 py-4">
            <Ban className="h-7 w-7 shrink-0 text-white" />
            <div>
              <p className="font-heading text-base font-bold uppercase tracking-widest text-white">
                DO NOT CLEAN THIS VEHICLE
              </p>
              <p className="mt-0.5 text-sm text-red-100">
                The customer has requested this vehicle is NOT washed or cleaned.
              </p>
            </div>
            <Ban className="ml-auto h-7 w-7 shrink-0 text-white" />
          </div>
        )}

        {(booking.includeFreshScent || booking.paintProtectionTier) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {booking.includeFreshScent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-bold text-white">
                <Sparkles className="h-3.5 w-3.5" /> Fresh Scent
              </span>
            )}
            {booking.paintProtectionTier && (
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan px-2.5 py-1 text-xs font-bold text-navy">
                <Droplets className="h-3.5 w-3.5" /> Paint Protection —{" "}
                {TIER_NAMES[booking.paintProtectionTier] ??
                  booking.paintProtectionTier}
              </span>
            )}
          </div>
        )}
      </header>

      <div className="space-y-4 p-4">
        {inspected && (
          <div className="flex items-center gap-2 rounded-xl border border-success bg-success/10 p-4 text-success">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-semibold">
              Inspection complete — you can now start the job.
            </span>
          </div>
        )}
        <section className="rounded-xl border border-line bg-white p-4">
          <Row icon={User} label="Customer" value={booking.customerName} />
          <Row
            icon={Car}
            label="Vehicle"
            value={[booking.vehicleColour, booking.vehicleMake, booking.vehicleModel]
              .filter(Boolean)
              .join(" ") || "—"}
          />
          <Row
            icon={MapPin}
            label="Location"
            value={`${booking.site.name} · ${booking.department.name}`}
          />
        </section>

        <section className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate">Service</span>
            <span className="font-semibold text-navy">
              {booking.serviceType.name}{" "}
              <span className="text-slate">
                ({booking.serviceType.durationMins}m)
              </span>
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-slate">Ready by</span>
            <span className="font-semibold text-navy">
              {formatTime(booking.readyByTime)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-slate">Allocated time</span>
            <span className="font-semibold text-navy">
              {minutesToHuman(allocatedMins)}
            </span>
          </div>
        </section>

        <JobStatusAction
          booking={{
            id: booking.id,
            status: booking.status,
            includeInspection: booking.includeInspection,
            inspectionComplete: booking.inspectionComplete,
            includeFreshScent: booking.includeFreshScent,
            paintProtectionTier: booking.paintProtectionTier,
          }}
        />

        {/* Before/After Photos */}
        <JobPhotosClient
          bookingId={booking.id}
          status={booking.status}
        />

        {/* Parking pin */}
        <ParkingPinClient
          bookingId={booking.id}
          status={booking.status}
          parkingLat={booking.parkingLat}
          parkingLng={booking.parkingLng}
          parkingConfirmedAt={booking.parkingConfirmedAt}
        />

        {booking.photographyPackage && (
          <Link
            href={`/valeter/jobs/${booking.id}/photography`}
            className="flex items-center justify-between rounded-xl border border-cyan bg-cyan/10 p-4 transition active:scale-[0.99]"
          >
            <span className="flex items-center gap-3">
              <Camera className="h-5 w-5 text-cyan-600" />
              <span>
                <span className="block font-heading font-bold text-navy">
                  Photography
                </span>
                <span className="block text-sm text-slate">
                  Capture the {booking.photographyPackage} photo set for the dealership
                </span>
              </span>
            </span>
            <ChevronLeft className="h-5 w-5 rotate-180 text-cyan-600" />
          </Link>
        )}
      </div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
      <Icon className="h-5 w-5 text-cyan-600" />
      <span className="w-20 text-sm text-slate">{label}</span>
      <span className="flex-1 text-right font-medium text-navy">{value}</span>
    </div>
  );
}
