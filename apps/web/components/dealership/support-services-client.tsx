"use client";

import { useState } from "react";
import { CheckCircle2, X, Loader2, Calendar, MapPin, User, FileText, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import type { RouterOutputs } from "@/lib/trpc/react";

type SupportService = RouterOutputs["supportServices"]["list"][number];

const GROUP_LABELS: Record<string, string> = {
  EXTERIOR: "Exterior",
  SHOWROOM_LOUNGES: "Showroom & Customer Lounges",
  WORKSHOP: "Workshop & Behind the Scenes",
};

const GROUP_ORDER = ["EXTERIOR", "SHOWROOM_LOUNGES", "WORKSHOP"];

const GROUP_COLORS: Record<string, string> = {
  EXTERIOR: "border-sky-200 bg-sky-50 text-sky-700",
  SHOWROOM_LOUNGES: "border-violet-200 bg-violet-50 text-violet-700",
  WORKSHOP: "border-amber-200 bg-amber-50 text-amber-700",
};

const GROUP_ICON_COLORS: Record<string, string> = {
  EXTERIOR: "bg-sky-100 text-sky-600",
  SHOWROOM_LOUNGES: "bg-violet-100 text-violet-600",
  WORKSHOP: "bg-amber-100 text-amber-600",
};

const inputCls =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-slate-400";

export function SupportServicesClient() {
  const { data: services = [], isLoading } = trpc.supportServices.list.useQuery();
  const { data: sitesData = [] } = trpc.sites.list.useQuery();

  const [selectedService, setSelectedService] = useState<SupportService | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const grouped = GROUP_ORDER.reduce<Record<string, SupportService[]>>(
    (acc, g) => {
      acc[g] = services.filter((svc: SupportService) => svc.group === g);
      return acc;
    },
    {},
  );

  // Include any extra groups not in GROUP_ORDER
  services.forEach((svc: SupportService) => {
    if (!grouped[svc.group]) {
      grouped[svc.group] = services.filter((s: SupportService) => s.group === svc.group);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading support services…
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-8 py-16 text-center">
        <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        <div>
          <p className="text-lg font-bold text-slate-900">Request submitted</p>
          <p className="mt-1 text-sm text-slate-500">
            Our team will be in touch to confirm your booking.
          </p>
        </div>
        <button
          onClick={() => {
            setBookingSuccess(false);
            setSelectedService(null);
          }}
          className="mt-2 h-10 rounded-lg bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Book Another Service
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4 rounded-2xl border border-[#01696F]/20 bg-[#01696F]/5 p-5">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#01696F]/10 text-[#01696F]">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-bold text-[#28251D]">CSI Support Services</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Specialist cleaning services for your site — exterior, showroom, and workshop. Select a service below to request a booking.
          </p>
        </div>
      </div>

      {/* Service groups */}
      {GROUP_ORDER.map((group) => {
        const groupServices = grouped[group] ?? [];
        if (groupServices.length === 0) return null;
        const label = GROUP_LABELS[group] ?? group;
        const badgeCls = GROUP_COLORS[group] ?? "border-slate-200 bg-slate-50 text-slate-600";
        const iconCls = GROUP_ICON_COLORS[group] ?? "bg-slate-100 text-slate-600";

        return (
          <section key={group}>
            <div className="mb-3 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${badgeCls}`}
              >
                {label}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {groupServices.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => setSelectedService(svc)}
                  className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:border-orange-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-300"
                >
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconCls}`}
                  >
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {svc.name}
                    </p>
                    {svc.description && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {svc.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs font-medium text-orange-500">
                      Request booking →
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        );
      })}

      {services.length === 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center">
          <p className="text-sm text-slate-400">
            No support services are currently available. Contact your account manager for more information.
          </p>
        </div>
      )}

      {/* Booking Modal */}
      {selectedService && (
        <BookingModal
          service={selectedService}
          sites={sitesData.map((s) => ({ id: s.id, name: s.name }))}
          onClose={() => setSelectedService(null)}
          onSuccess={() => setBookingSuccess(true)}
        />
      )}
    </div>
  );
}

function BookingModal({
  service,
  sites,
  onClose,
  onSuccess,
}: {
  service: SupportService;
  sites: { id: string; name: string }[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [scheduledDate, setScheduledDate] = useState("");
  const [contactName, setContactName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const book = trpc.supportServices.book.useMutation({
    onSuccess: () => {
      onSuccess();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!siteId) {
      setError("Please select a site.");
      return;
    }
    if (!scheduledDate) {
      setError("Please select a preferred date.");
      return;
    }

    const parsed = new Date(scheduledDate);
    if (isNaN(parsed.getTime())) {
      setError("Invalid date selected.");
      return;
    }

    book.mutate({
      serviceId: service.id,
      siteId,
      scheduledDate: parsed,
      contactName: contactName.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Request Booking
            </p>
            <h3 className="mt-0.5 text-base font-bold text-slate-900">
              {service.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Site */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <MapPin className="h-3 w-3" />
              Site
            </label>
            {sites.length === 0 ? (
              <p className="text-sm text-slate-400">No sites available.</p>
            ) : (
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                required
                className={inputCls}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Calendar className="h-3 w-3" />
              Preferred Date
            </label>
            <input
              type="date"
              required
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className={inputCls}
            />
          </div>

          {/* Contact Name */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <User className="h-3 w-3" />
              Contact Name{" "}
              <span className="font-normal normal-case text-slate-400">
                (optional)
              </span>
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Who should we contact on site?"
              className={inputCls}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <FileText className="h-3 w-3" />
              Notes{" "}
              <span className="font-normal normal-case text-slate-400">
                (optional)
              </span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any specific requirements or access instructions…"
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100 placeholder:text-slate-400"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={book.isPending || sites.length === 0}
              className="flex-1 h-11 rounded-lg bg-orange-500 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {book.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
