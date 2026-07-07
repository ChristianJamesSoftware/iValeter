"use client";

import React, { useState } from "react";
import {
  MapPin, Ban, User, Car, Clock, Building2, CalendarDays,
  Layers, Star, ClipboardList, History, Pencil, MessageSquarePlus, X,
} from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { JobStatusBadge } from "@/components/brand/job-status-badge";
import { PriorityBadge } from "@/components/brand/priority-badge";
import { formatTime } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type BookingStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "QC_CHECK" | "COMPLETED" | "CANCELLED";
type VehicleSize   = "SMALL" | "MEDIUM" | "LARGE" | "XL" | "VAN";

interface HistoryEntry {
  id: string;
  fromStatus: BookingStatus | null;
  toStatus: BookingStatus;
  note: string | null;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

interface Photo {
  id: string;
  url: string;
  label: string | null;
}

interface Booking {
  id: string;
  vehicleReg: string;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleColour?: string | null;
  vehicleSize?: VehicleSize | null;
  customerName: string;
  keyNumber?: string | null;
  vehicleLocation?: string | null;
  status: BookingStatus;
  isPriority: boolean;
  rollCount?: number | null;
  readyByTime: string;
  qualityScore?: number | null;
  qualityNote?: string | null;
  customerReviewNote?: string | null;
  doNotClean: boolean;
  budgetLimit?: number | null;
  parkingLat?: number | null;
  parkingLng?: number | null;
  paintProtectionTier?: string | null;
  paintProtectionProductId?: string | null;
  includeFreshScent: boolean;
  includeInspection: boolean;
  photographyPackage?: string | null;
  createdAt: string;
  completedAt?: string | null;
  site: { name: string };
  department: { name: string };
  serviceType: { id: string; name: string };
  assignedTo?: { firstName: string; lastName: string } | null;
  createdBy?: { firstName: string; lastName: string } | null;
  statusHistory: HistoryEntry[];
}

interface Props {
  booking: Booking;
  photos: Photo[];
}

// ─── Detail row ────────────────────────────────────────────────────────────

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

// ─── Add Note Modal ────────────────────────────────────────────────────────

function AddNoteModal({
  bookingId,
  onClose,
  onDone,
}: {
  bookingId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [text, setText] = useState("");
  const [err, setErr]   = useState("");

  const addNote = trpc.bookings.addNote.useMutation({
    onSuccess: () => { onDone(); onClose(); },
    onError:   (e) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Add Note</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Enter an ops note for this booking…"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        />
        {err && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}
        <div className="mt-4 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            disabled={!text.trim() || addNote.isPending}
            onClick={() => addNote.mutate({ id: bookingId, note: text.trim() })}
            className="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {addNote.isPending ? "Saving…" : "Save Note"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Booking Modal ────────────────────────────────────────────────────

function EditBookingModal({
  booking,
  onClose,
  onDone,
}: {
  booking: Booking;
  onClose: () => void;
  onDone: () => void;
}) {
  const [vehicleReg,      setVehicleReg]      = useState(booking.vehicleReg);
  const [customerName,    setCustomerName]    = useState(booking.customerName);
  const [vehicleMake,     setVehicleMake]     = useState(booking.vehicleMake ?? "");
  const [vehicleModel,    setVehicleModel]    = useState(booking.vehicleModel ?? "");
  const [vehicleColour,   setVehicleColour]   = useState(booking.vehicleColour ?? "");
  const [vehicleSize,     setVehicleSize]     = useState<VehicleSize | "">(booking.vehicleSize ?? "");
  const [keyNumber,       setKeyNumber]       = useState(booking.keyNumber ?? "");
  const [vehicleLocation, setVehicleLocation] = useState(booking.vehicleLocation ?? "");
  // readyByTime — keep as local datetime string
  const dtLocal = new Date(booking.readyByTime);
  const pad = (n: number) => String(n).padStart(2, "0");
  const localDefault = `${dtLocal.getFullYear()}-${pad(dtLocal.getMonth() + 1)}-${pad(dtLocal.getDate())}T${pad(dtLocal.getHours())}:${pad(dtLocal.getMinutes())}`;
  const [readyByTime, setReadyByTime] = useState(localDefault);
  const [err, setErr] = useState("");

  const updateMutation = trpc.bookings.update.useMutation({
    onSuccess: () => { onDone(); onClose(); },
    onError:   (e) => setErr(e.message),
  });

  const INPUT = "h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";
  const LABEL = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400";
  const SIZES: VehicleSize[] = ["SMALL", "MEDIUM", "LARGE", "XL", "VAN"];

  function handleSave() {
    setErr("");
    updateMutation.mutate({
      id: booking.id,
      vehicleReg:      vehicleReg.trim().toUpperCase(),
      customerName:    customerName.trim(),
      vehicleMake:     vehicleMake  || undefined,
      vehicleModel:    vehicleModel  || undefined,
      vehicleColour:   vehicleColour || undefined,
      vehicleSize:     vehicleSize   || undefined,
      keyNumber:       keyNumber      || undefined,
      vehicleLocation: vehicleLocation || undefined,
      readyByTime:     new Date(readyByTime),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Edit Booking</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Vehicle Reg *</label>
              <input value={vehicleReg} onChange={(e) => setVehicleReg(e.target.value.toUpperCase())} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Customer Name *</label>
              <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className={INPUT} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Make</label>
              <input value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} className={INPUT} placeholder="e.g. BMW" />
            </div>
            <div>
              <label className={LABEL}>Model</label>
              <input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} className={INPUT} placeholder="e.g. 3 Series" />
            </div>
            <div>
              <label className={LABEL}>Colour</label>
              <input value={vehicleColour} onChange={(e) => setVehicleColour(e.target.value)} className={INPUT} placeholder="e.g. Black" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Vehicle Size</label>
              <select value={vehicleSize} onChange={(e) => setVehicleSize(e.target.value as VehicleSize | "")} className={INPUT}>
                <option value="">— Not set —</option>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Key Number</label>
              <input value={keyNumber} onChange={(e) => setKeyNumber(e.target.value)} className={INPUT} placeholder="Key tag number" />
            </div>
          </div>

          <div>
            <label className={LABEL}>Vehicle Location</label>
            <input value={vehicleLocation} onChange={(e) => setVehicleLocation(e.target.value)} className={INPUT} placeholder="e.g. Bay 3, Forecourt" />
          </div>

          <div>
            <label className={LABEL}>Ready By Time</label>
            <input
              type="datetime-local"
              value={readyByTime}
              onChange={(e) => setReadyByTime(e.target.value)}
              className={INPUT}
            />
          </div>
        </div>

        {err && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            disabled={!vehicleReg.trim() || !customerName.trim() || updateMutation.isPending}
            onClick={handleSave}
            className="flex-1 rounded-xl bg-[#1C1A16] py-2.5 text-sm font-bold text-white hover:bg-[#1C1A16]/90 disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

export function BookingDetailClient({ booking: initialBooking, photos }: Props) {
  const [showEdit, setShowEdit]   = useState(false);
  const [showNote, setShowNote]   = useState(false);

  // Live-reload the booking when edits or notes are saved
  const { data: liveData, refetch } = trpc.bookings.getById.useQuery(
    { id: initialBooking.id },
    { initialData: initialBooking as never, refetchOnWindowFocus: false },
  );

  // Cast to Booking — tRPC returns Date objects on the server which become strings over the wire
  const booking = (liveData ?? initialBooking) as unknown as Booking;

  const vehicleDesc = [booking.vehicleColour, booking.vehicleMake, booking.vehicleModel]
    .filter(Boolean).join(" ");

  const addOns = [
    booking.paintProtectionTier || (booking.paintProtectionProductId ? "Paint Protection" : null),
    booking.includeFreshScent ? "CSI Fresh Scent" : null,
    booking.includeInspection ? "Pre-valet Inspection" : null,
    booking.photographyPackage ? `Photography (${booking.photographyPackage})` : null,
  ].filter(Boolean);

  const canEdit = booking.status !== "COMPLETED" && booking.status !== "CANCELLED";

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

        {/* Action buttons */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowNote(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            <MessageSquarePlus className="h-4 w-4 text-slate-400" />
            Add Note
          </button>
          {canEdit && (
            <button
              onClick={() => setShowEdit(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1C1A16] px-3 py-2 text-sm font-bold text-white shadow-sm hover:bg-[#1C1A16]/90 transition"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
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
          <Detail icon={User}         label="Customer"         value={booking.customerName} />
          <Detail icon={Car}          label="Vehicle"          value={vehicleDesc || "—"} />
          <Detail icon={Clock}        label="Ready by"         value={formatTime(booking.readyByTime)} />
          <Detail icon={Building2}    label="Site"             value={booking.site.name} />
          <Detail icon={Layers}       label="Department"       value={booking.department.name} />
          <Detail icon={ClipboardList} label="Service"         value={booking.serviceType.name} />
          {booking.vehicleSize && (
            <Detail icon={Car}        label="Vehicle Size"     value={booking.vehicleSize} />
          )}
          {booking.keyNumber && (
            <Detail icon={Car}        label="Key Number"       value={booking.keyNumber} />
          )}
          {booking.vehicleLocation && (
            <Detail icon={MapPin}     label="Vehicle Location" value={booking.vehicleLocation} />
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

      {/* Audit trail / Status history */}
      {booking.statusHistory && booking.statusHistory.length > 0 && (
        <section className="mb-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            <History className="mr-1.5 inline h-3.5 w-3.5" />
            Audit Trail
          </h2>
          <ol className="space-y-2">
            {[...booking.statusHistory].reverse().map((h) => {
              const isNote = h.fromStatus === h.toStatus;
              return (
                <li key={h.id} className={`flex items-start gap-3 text-sm rounded-lg px-3 py-2 ${isNote ? "bg-amber-50 border border-amber-100" : "bg-slate-50"}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isNote ? "bg-amber-400" : "bg-orange-400"}`} />
                  <div>
                    {isNote ? (
                      <span className="font-semibold text-amber-700">Note</span>
                    ) : (
                      <span className="font-semibold text-slate-700">{h.fromStatus ?? "—"} → {h.toStatus}</span>
                    )}
                    <span className="ml-2 text-slate-400 text-xs">
                      {h.user.firstName} {h.user.lastName} ·{" "}
                      {new Date(h.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}{" "}
                      {new Date(h.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </span>
                    {h.note && <p className="mt-0.5 text-xs text-slate-600">"{h.note}"</p>}
                  </div>
                </li>
              );
            })}
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

      {/* Modals */}
      {showNote && (
        <AddNoteModal
          bookingId={booking.id}
          onClose={() => setShowNote(false)}
          onDone={() => refetch()}
        />
      )}
      {showEdit && (
        <EditBookingModal
          booking={booking}
          onClose={() => setShowEdit(false)}
          onDone={() => refetch()}
        />
      )}
    </div>
  );
}
