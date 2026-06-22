import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Car, User } from "lucide-react";
import { TRPCError } from "@trpc/server";
import { getServerApi } from "@/lib/trpc/server";
import { formatTime, minutesToHuman } from "@/lib/utils";
import { JobStatusBadge } from "@/components/brand/job-status-badge";
import { PriorityBadge } from "@/components/brand/priority-badge";
import { SLATimer } from "@/components/brand/sla-timer";
import { JobStatusAction } from "@/components/valeter/job-status-action";

export const dynamic = "force-dynamic";

export default async function ValeterJobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await getServerApi();

  let booking;
  try {
    booking = await api.bookings.getById({ id });
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const durationMins =
    booking.completedAt != null
      ? Math.round(
          (new Date(booking.completedAt).getTime() -
            new Date(booking.createdAt).getTime()) /
            60000,
        )
      : null;

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
      </header>

      <div className="space-y-4 p-4">
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
          {booking.completedAt && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-slate">Completed in</span>
              <span className="font-semibold text-success">
                {minutesToHuman(durationMins ?? 0)}
              </span>
            </div>
          )}
        </section>

        <JobStatusAction bookingId={booking.id} status={booking.status} />
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
