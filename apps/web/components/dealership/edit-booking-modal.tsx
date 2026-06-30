"use client";

import { useEffect, useRef, useState } from "react";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@ivaleter/db";

interface ServiceTypeOpt {
  id: string;
  name: string;
  durationMins: number;
}
interface DeptOpt {
  id: string;
  name: string;
  serviceTypes: ServiceTypeOpt[];
}

interface BookingToEdit {
  id: string;
  vehicleReg: string;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleColour?: string | null;
  customerName: string;
  readyByTime: string; // ISO string
  keyNumber?: string | null;
  vehicleLocation?: string | null;
  status: BookingStatus;
  serviceType: { id: string; name: string };
  department: { id: string; name: string } | null;
  siteId: string;
}

interface Props {
  booking: BookingToEdit;
  departments: DeptOpt[]; // departments for the site
  onClose: () => void;
  onSaved: () => void;
}

function toDatetimeLocal(isoStr: string): string {
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditBookingModal({ booking, departments, onClose, onSaved }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const [vehicleReg, setVehicleReg] = useState(booking.vehicleReg);
  const [vehicleMake, setVehicleMake] = useState(booking.vehicleMake ?? "");
  const [vehicleModel, setVehicleModel] = useState(booking.vehicleModel ?? "");
  const [vehicleColour, setVehicleColour] = useState(booking.vehicleColour ?? "");
  const [customerName, setCustomerName] = useState(booking.customerName);
  const [readyByTime, setReadyByTime] = useState(toDatetimeLocal(booking.readyByTime));
  const [keyNumber, setKeyNumber] = useState(booking.keyNumber ?? "");
  const [vehicleLocation, setVehicleLocation] = useState(booking.vehicleLocation ?? "");

  // Department / service type selectors
  const [departmentId, setDepartmentId] = useState(booking.department?.id ?? departments[0]?.id ?? "");
  const activeDept = departments.find((d) => d.id === departmentId);
  const [serviceTypeId, setServiceTypeId] = useState(booking.serviceType.id);

  // When dept changes, reset service type to first available
  useEffect(() => {
    const first = activeDept?.serviceTypes[0]?.id;
    if (first) setServiceTypeId(first);
  }, [departmentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateMutation = trpc.bookings.update.useMutation({
    onSuccess: () => {
      onSaved();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMutation.mutate({
      id: booking.id,
      vehicleReg,
      vehicleMake: vehicleMake || undefined,
      vehicleModel: vehicleModel || undefined,
      vehicleColour: vehicleColour || undefined,
      customerName,
      readyByTime: new Date(readyByTime),
      keyNumber: keyNumber || undefined,
      vehicleLocation: vehicleLocation || undefined,
      serviceTypeId,
    });
  }

  // Close on overlay click
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isEditableStatus =
    booking.status !== "COMPLETED" && booking.status !== "CANCELLED";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div>
            <h2 className="font-heading text-lg font-bold text-navy">Edit Booking</h2>
            <p className="text-xs text-slate">{booking.vehicleReg}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate hover:bg-offwhite hover:text-navy"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {!isEditableStatus ? (
          <div className="flex items-center gap-3 p-6 text-sm text-slate">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            This booking is {booking.status.toLowerCase()} and cannot be edited.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="divide-y divide-line">
            <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
              {/* Vehicle Reg */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Vehicle Reg
                </label>
                <input
                  value={vehicleReg}
                  onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
                  required
                  className="h-10 w-full rounded-lg border border-line bg-offwhite px-3 font-heading text-sm font-bold tracking-wider text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                />
              </div>

              {/* Vehicle Make */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Make
                </label>
                <input
                  value={vehicleMake}
                  onChange={(e) => setVehicleMake(e.target.value)}
                  placeholder="e.g. BMW"
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                />
              </div>

              {/* Vehicle Model */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Model
                </label>
                <input
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  placeholder="e.g. 3 Series"
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                />
              </div>

              {/* Colour */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Colour
                </label>
                <input
                  value={vehicleColour}
                  onChange={(e) => setVehicleColour(e.target.value)}
                  placeholder="e.g. Black"
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                />
              </div>

              {/* Customer Name */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Customer Name
                </label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                />
              </div>

              {/* Ready By */}
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Ready By
                </label>
                <input
                  type="datetime-local"
                  value={readyByTime}
                  onChange={(e) => setReadyByTime(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                />
              </div>

              {/* Department */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Department
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Type */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Service Type
                </label>
                <select
                  value={serviceTypeId}
                  onChange={(e) => setServiceTypeId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                >
                  {(activeDept?.serviceTypes ?? []).map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({Math.round(st.durationMins / 60 * 10) / 10}h)
                    </option>
                  ))}
                </select>
              </div>

              {/* Key Number */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Key Number
                </label>
                <input
                  value={keyNumber}
                  onChange={(e) => setKeyNumber(e.target.value)}
                  placeholder="Optional"
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                />
              </div>

              {/* Vehicle Location */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate">
                  Vehicle Location
                </label>
                <input
                  value={vehicleLocation}
                  onChange={(e) => setVehicleLocation(e.target.value)}
                  placeholder="e.g. Bay 4"
                  className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
                />
              </div>
            </div>

            {/* Error */}
            {updateMutation.error && (
              <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {updateMutation.error.message}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-slate hover:bg-offwhite"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition",
                  updateMutation.isPending
                    ? "cursor-not-allowed bg-navy/60"
                    : "bg-navy hover:bg-navy/90",
                )}
              >
                {updateMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
