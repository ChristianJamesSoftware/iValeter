import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { getServerApi } from "@/lib/trpc/server";
import { BookingDetailClient } from "@/components/org/booking-detail-client";

export const dynamic = "force-dynamic";

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
    photos  = await api.bookings.getPhotos({ bookingId: id });
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  // Serialise dates to strings for the client component
  const serialised = {
    ...booking,
    readyByTime:  booking.readyByTime.toISOString(),
    createdAt:    booking.createdAt.toISOString(),
    completedAt:  booking.completedAt?.toISOString() ?? null,
    statusHistory: booking.statusHistory.map((h) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    })),
  };

  return <BookingDetailClient booking={serialised as never} photos={photos} />;
}
