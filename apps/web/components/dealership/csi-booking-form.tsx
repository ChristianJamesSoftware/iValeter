"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/react";

const GROUP_LABELS: Record<string, string> = {
  EXTERIOR: "Exterior",
  SHOWROOM_LOUNGES: "Showroom & Customer Lounges",
  WORKSHOP: "Workshop & Behind the Scenes",
};

/** Human-readable label for any group key, including custom ones added via settings */
function groupLabel(key: string): string {
  if (GROUP_LABELS[key]) return GROUP_LABELS[key];
  // Convert snake_case / UPPER_SNAKE to Title Case
  return key
    .toLowerCase()
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function todayString(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const INPUT_CLASS =
  "h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-navy">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {children}
    </div>
  );
}

export function CsiBookingForm(): React.JSX.Element {
  const servicesQuery = trpc.supportServices.list.useQuery();
  const sitesQuery = trpc.sites.list.useQuery();

  const [serviceId, setServiceId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [requiredByDate, setRequiredByDate] = useState(todayString());
  const [contactName, setContactName] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [notes, setNotes] = useState("");

  // Callback mode state
  const [callbackMode, setCallbackMode] = useState(false);
  const [callbackNeeds, setCallbackNeeds] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [submittedContact, setSubmittedContact] = useState("");

  const book = trpc.supportServices.book.useMutation({
    onSuccess: () => {
      setSubmittedContact(contactName);
      setSubmitted(true);
    },
  });

  const services = servicesQuery.data ?? [];
  const sites = sitesQuery.data ?? [];

  // Group services
  const grouped: Record<string, typeof services> = {};
  for (const svc of services) {
    const g = svc.group ?? "OTHER";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(svc);
  }

  const canSubmit =
    serviceId &&
    siteId &&
    contactName.trim() &&
    (callbackMode ? callbackNeeds.trim() : requiredByDate) &&
    !book.isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    const combinedNotes = callbackMode
      ? ["CALLBACK REQUEST", callbackNeeds, specialRequests, notes]
          .filter(Boolean)
          .join(" | ")
      : [specialRequests, notes].filter(Boolean).join(" | ") || undefined;

    book.mutate({
      serviceId,
      siteId,
      scheduledDate: callbackMode ? new Date() : new Date(requiredByDate),
      contactName: contactName.trim(),
      notes: combinedNotes ?? undefined,
    });
  }

  function handleMakeAnother() {
    setSubmitted(false);
    setServiceId("");
    setSiteId("");
    setRequiredByDate(todayString());
    setContactName("");
    setSpecialRequests("");
    setNotes("");
    setCallbackMode(false);
    setCallbackNeeds("");
    book.reset();
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <svg
            className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <div>
            <p className="font-heading text-lg font-bold text-emerald-800">
              Booking request submitted
            </p>
            <p className="mt-1 text-sm text-emerald-700">
              Our team will contact{" "}
              <span className="font-semibold">{submittedContact}</span> to
              confirm.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleMakeAnother}
          className="mt-4 h-10 rounded-lg border border-emerald-600 px-4 font-heading text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          Make another booking
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div className="space-y-4">
        {/* Service */}
        <Field label="Service" required>
          {servicesQuery.isLoading ? (
            <div className="flex h-10 items-center text-sm text-slate-400">
              Loading services…
            </div>
          ) : services.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              No services available
            </p>
          ) : (
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Select a service…</option>
              {Object.entries(grouped).map(([group, svcs]) => (
                <optgroup
                  key={group}
                  label={groupLabel(group)}
                >
                  {svcs.map((svc) => (
                    <option key={svc.id} value={svc.id}>
                      {svc.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}
        </Field>

        {/* Site */}
        <Field label="Site" required>
          {sitesQuery.isLoading ? (
            <div className="flex h-10 items-center text-sm text-slate-400">
              Loading sites…
            </div>
          ) : (
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">Select a site…</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        {/* Date Required By — hidden in callback mode */}
        {!callbackMode && (
          <Field label="Date Required By" required>
            <input
              type="date"
              value={requiredByDate}
              min={todayString()}
              onChange={(e) => setRequiredByDate(e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
        )}

        {/* Contact Name */}
        <Field label="Contact Name" required>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Name of person to contact on site"
            className={INPUT_CLASS}
          />
        </Field>

        {/* Special Requests */}
        <Field label="Special Requests">
          <input
            type="text"
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Any specific requirements…"
            className={INPUT_CLASS}
          />
        </Field>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Access instructions, additional details…"
            rows={3}
            className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20"
          />
        </Field>

        {/* Callback mode: What do you need? */}
        {callbackMode && (
          <Field label="What do you need?" required>
            <textarea
              value={callbackNeeds}
              onChange={(e) => setCallbackNeeds(e.target.value)}
              placeholder="Describe what support you need…"
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-[#01696F] focus:ring-2 focus:ring-[#01696F]/20"
            />
          </Field>
        )}

        {book.error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {book.error.message}
          </p>
        )}

        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="h-14 w-full rounded-lg bg-[#01696F] font-heading text-lg font-bold text-white transition hover:bg-[#015559] disabled:opacity-60"
        >
          {book.isPending
            ? callbackMode
              ? "Requesting…"
              : "Submitting…"
            : callbackMode
              ? "Request a Callback"
              : "Submit Booking Request"}
        </button>

        {/* Support with another service — callback mode toggle */}
        {!callbackMode && (
          <button
            type="button"
            onClick={() => setCallbackMode(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#01696F] font-heading text-sm font-semibold text-[#01696F] transition hover:bg-[#01696F]/10"
          >
            Support with another service
          </button>
        )}
        {callbackMode && (
          <button
            type="button"
            onClick={() => setCallbackMode(false)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 font-heading text-sm font-semibold text-slate-500 transition hover:bg-slate-50"
          >
            Back to standard booking
          </button>
        )}
      </div>
    </div>
  );
}
