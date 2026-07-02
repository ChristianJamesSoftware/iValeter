"use client";

import { useState } from "react";
import { Power, PlusCircle, CheckCircle2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import type { RouterOutputs } from "@/lib/trpc/react";

type SupportService = RouterOutputs["supportServices"]["listAll"][number];
type Booking = RouterOutputs["supportServices"]["listBookings"][number];

const GROUP_LABELS: Record<string, string> = {
  EXTERIOR: "Exterior",
  SHOWROOM_LOUNGES: "Showroom & Customer Lounges",
  WORKSHOP: "Workshop & Behind the Scenes",
};

function groupLabel(key: string): string {
  if (GROUP_LABELS[key]) return GROUP_LABELS[key];
  return key
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const GROUP_ORDER = ["EXTERIOR", "SHOWROOM_LOUNGES", "WORKSHOP"];

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const inputCls =
  "h-9 w-full rounded-lg border border-[#D4D1CA] bg-white px-3 text-sm text-[#28251D] outline-none transition focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20";

export function SupportServicesTab() {
  const utils = trpc.useUtils();

  const { data: services = [], isLoading: servicesLoading } =
    trpc.supportServices.listAll.useQuery();
  const { data: bookings = [], isLoading: bookingsLoading } =
    trpc.supportServices.listBookings.useQuery();

  const toggleActive = trpc.supportServices.toggleActive.useMutation({
    onSuccess: () => utils.supportServices.listAll.invalidate(),
  });

  const addService = trpc.supportServices.add.useMutation({
    onSuccess: () => {
      utils.supportServices.listAll.invalidate();
      setAddForm({ name: "", group: "EXTERIOR", description: "" });
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    },
  });

  const updateStatus = trpc.supportServices.updateStatus.useMutation({
    onSuccess: () => utils.supportServices.listBookings.invalidate(),
  });

  const [addForm, setAddForm] = useState({
    name: "",
    group: "EXTERIOR",
    description: "",
  });
  const [addSuccess, setAddSuccess] = useState(false);

  // Group services
  const grouped = GROUP_ORDER.reduce<Record<string, SupportService[]>>(
    (acc, g) => {
      acc[g] = services.filter((svc: SupportService) => svc.group === g);
      return acc;
    },
    {},
  );

  // Also include any groups not in GROUP_ORDER
  services.forEach((svc: SupportService) => {
    if (!grouped[svc.group]) {
      grouped[svc.group] = services.filter((s: SupportService) => s.group === svc.group);
    }
  });

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    addService.mutate({
      name: addForm.name.trim(),
      group: addForm.group,
      description: addForm.description.trim() || undefined,
    });
  }

  if (servicesLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading support services…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Ops context banner */}
      <div className="rounded-xl border border-[#01696F]/20 bg-[#01696F]/5 px-5 py-4">
        <p className="text-sm font-semibold text-[#01696F]">CSI Service Catalogue — Ops Management</p>
        <p className="mt-0.5 text-xs text-slate-500">Manage the list of services available for dealers to book via the customer platform. Toggle services on/off, add custom ones, and manage incoming booking requests below.</p>
      </div>

      {/* Catalogue groups */}
      {GROUP_ORDER.map((group) => {
        const groupServices = grouped[group] ?? [];
        const label = groupLabel(group);

        return (
          <div
            key={group}
            className="rounded-xl border border-[#D4D1CA] bg-white p-5"
          >
            <h3 className="mb-4 font-heading text-sm font-black uppercase tracking-wider text-slate-500">
              {label}
            </h3>
            {groupServices.length === 0 ? (
              <p className="text-sm text-slate-400">No services in this group.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {groupServices.map((svc) => (
                  <ServiceRow
                    key={svc.id}
                    service={svc}
                    onToggle={() => toggleActive.mutate({ id: svc.id })}
                    isToggling={
                      toggleActive.isPending &&
                      toggleActive.variables?.id === svc.id
                    }
                  />
                ))}
              </ul>
            )}
          </div>
        );
      })}

      {/* Add Custom Service */}
      <div className="rounded-xl border border-[#D4D1CA] bg-white p-5">
        <h3 className="mb-1 font-heading text-sm font-black uppercase tracking-wider text-slate-500">
          Add Custom Service
        </h3>
        <p className="mb-4 text-xs text-slate-400">
          Add a bespoke service to the catalogue for this organisation.
        </p>
        <form onSubmit={handleAddSubmit} className="max-w-lg space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Service Name
            </label>
            <input
              type="text"
              required
              minLength={2}
              value={addForm.name}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. Roof & Gutter Cleaning"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Group
            </label>
            <select
              value={addForm.group}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, group: e.target.value }))
              }
              className={inputCls}
            >
              {GROUP_ORDER.map((g) => (
                <option key={g} value={g}>
                  {groupLabel(g)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              Description{" "}
              <span className="font-normal normal-case text-slate-400">
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={addForm.description}
              onChange={(e) =>
                setAddForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Brief description of the service"
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={addService.isPending}
              className="flex h-9 items-center gap-2 rounded-lg bg-[#01696F] px-4 text-sm font-semibold text-white transition hover:bg-[#015a5f] disabled:opacity-60"
            >
              {addService.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlusCircle className="h-3.5 w-3.5" />
              )}
              Add Service
            </button>
            {addSuccess && (
              <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Service added
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Recent Bookings */}
      <div className="rounded-xl border border-[#D4D1CA] bg-white p-5">
        <h3 className="mb-4 font-heading text-sm font-black uppercase tracking-wider text-slate-500">
          Recent Bookings
        </h3>
        {bookingsLoading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading bookings…
          </div>
        ) : bookings.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">
            No bookings yet. When dealerships request support services, they will
            appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-2 pr-4 text-left">Date</th>
                  <th className="pb-2 pr-4 text-left">Service</th>
                  <th className="pb-2 pr-4 text-left">Site</th>
                  <th className="pb-2 pr-4 text-left">Contact</th>
                  <th className="pb-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookings.map((booking: Booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    onStatusChange={(status) =>
                      updateStatus.mutate({ id: booking.id, status })
                    }
                    isUpdating={
                      updateStatus.isPending &&
                      updateStatus.variables?.id === booking.id
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ServiceRow({
  service,
  onToggle,
  isToggling,
}: {
  service: SupportService;
  onToggle: () => void;
  isToggling: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold ${
            service.isActive ? "text-[#28251D]" : "text-slate-400"
          }`}
        >
          {service.name}
        </p>
        {service.description && (
          <p className="mt-0.5 text-xs text-slate-400">{service.description}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onToggle}
          disabled={isToggling}
          className={`rounded-lg p-1.5 transition ${
            service.isActive
              ? "text-emerald-500 hover:bg-red-50 hover:text-red-500"
              : "text-slate-300 hover:bg-emerald-50 hover:text-emerald-500"
          } disabled:opacity-50`}
        >
          {isToggling ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Power className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </li>
  );
}

type BookingStatus = "REQUESTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

function BookingRow({
  booking,
  onStatusChange,
  isUpdating,
}: {
  booking: Booking;
  onStatusChange: (status: BookingStatus) => void;
  isUpdating: boolean;
}) {
  const date = new Date(booking.scheduledDate);
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <tr className="group">
      <td className="py-3 pr-4 text-slate-600">{dateStr}</td>
      <td className="py-3 pr-4 font-medium text-[#28251D]">
        {booking.service.name}
      </td>
      <td className="py-3 pr-4 text-slate-600">{booking.site.name}</td>
      <td className="py-3 pr-4 text-slate-500">
        {booking.contactName ?? "—"}
      </td>
      <td className="py-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
              STATUS_COLORS[booking.status] ?? "bg-slate-100 text-slate-500"
            }`}
          >
            {STATUS_LABELS[booking.status] ?? booking.status}
          </span>
          <select
            value={booking.status}
            onChange={(e) => onStatusChange(e.target.value as BookingStatus)}
            disabled={isUpdating}
            className="h-7 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none transition focus:border-[#01696F] focus:ring-1 focus:ring-[#01696F]/20 disabled:opacity-50"
          >
            <option value="REQUESTED">Requested</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          {isUpdating && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
          )}
        </div>
      </td>
    </tr>
  );
}
