"use client";

import { useState } from "react";
import { MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

type BookingStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "QC_CHECK" | "COMPLETED" | "CANCELLED";

interface Props {
  bookingId: string;
  status: BookingStatus;
  parkingLat?: number | null;
  parkingLng?: number | null;
  parkingConfirmedAt?: Date | string | null;
}

export function ParkingPinClient({ bookingId, status, parkingLat, parkingLng, parkingConfirmedAt }: Props) {
  const [locError, setLocError] = useState<string | null>(null);
  const [isPinning, setIsPinning] = useState(false);

  const utils = trpc.useUtils();
  const confirmParking = trpc.bookings.confirmParking.useMutation({
    onSuccess: () => {
      utils.bookings.getById.invalidate({ id: bookingId });
      setIsPinning(false);
    },
    onError: (err) => {
      setLocError(err.message);
      setIsPinning(false);
    },
  });

  const showPin = status === "IN_PROGRESS" || status === "QC_CHECK" || status === "COMPLETED";
  if (!showPin) return null;

  function handlePin() {
    setLocError(null);
    setIsPinning(true);
    if (!navigator.geolocation) {
      setLocError("Location unavailable — please ensure location is enabled");
      setIsPinning(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        confirmParking.mutate({
          bookingId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        setLocError("Location unavailable — please ensure location is enabled");
        setIsPinning(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }

  const hasPin = parkingLat != null && parkingLng != null;
  const mapsUrl = hasPin ? `https://maps.google.com/?q=${parkingLat},${parkingLng}` : null;

  const confirmedTimeStr = parkingConfirmedAt
    ? new Date(parkingConfirmedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-5 w-5 text-teal-600" />
        <h2 className="font-heading font-bold text-navy">Vehicle Parking Location</h2>
      </div>

      {hasPin ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-700 font-semibold">
            Location pinned{confirmedTimeStr ? ` at ${confirmedTimeStr}` : ""}.
          </p>
          <a
            href={mapsUrl!}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:underline font-medium"
          >
            <MapPin className="h-4 w-4" /> View location →
          </a>
          <div>
            <button
              onClick={handlePin}
              disabled={isPinning || confirmParking.isPending}
              className="mt-2 rounded-lg border border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-50"
            >
              {isPinning || confirmParking.isPending ? "Updating…" : "Update pin"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm text-slate-500">Drop a GPS pin to mark where the vehicle has been parked.</p>
          <button
            onClick={handlePin}
            disabled={isPinning || confirmParking.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-4 font-heading text-base font-bold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            <MapPin className="h-5 w-5" />
            {isPinning || confirmParking.isPending ? "Getting location…" : "📍 Pin Parking Location"}
          </button>
        </div>
      )}

      {locError && (
        <p className="mt-2 text-sm text-red-500">{locError}</p>
      )}
    </div>
  );
}
