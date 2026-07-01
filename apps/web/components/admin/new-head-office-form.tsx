"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/react";

export function NewHeadOfficeForm() {
  const router = useRouter();
  const create = trpc.organisations.createHeadOffice.useMutation({
    onSuccess: (res) => {
      router.push(`/admin/organisations/${res.id}`);
      router.refresh();
    },
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const canSubmit = name.trim().length > 0 && !create.isPending;

  function submit() {
    if (!canSubmit) return;
    create.mutate({
      name: name.trim(),
      address: address.trim() || undefined,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
    });
  }

  return (
    <div className="max-w-xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="space-y-4">

        <Field label="Head office name *" required>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Arnold Clark Group"
            className={INPUT}
            autoFocus
          />
        </Field>

        <Field label="Address">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Head office address"
            className={INPUT}
          />
        </Field>

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
            Primary Contact
          </p>
          <div className="space-y-3">
            <Field label="Contact name">
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Full name"
                className={INPUT}
              />
            </Field>
            <Field label="Contact email">
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="email@example.com"
                className={INPUT}
              />
            </Field>
            <Field label="Contact phone">
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+44 7700 000000"
                className={INPUT}
              />
            </Field>
          </div>
        </div>

        {create.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {create.error.message}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className="h-11 rounded-lg bg-navy px-6 font-heading font-semibold text-white transition hover:bg-navy/90 disabled:opacity-50"
          >
            {create.isPending ? "Creating…" : "Create head office"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="h-11 rounded-lg border border-line px-6 font-heading font-semibold text-slate transition hover:bg-offwhite"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-navy">
        {label}
        {required && <span className="ml-0.5 text-red-400">*</span>}
      </span>
      {children}
    </label>
  );
}

const INPUT =
  "h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-navy outline-none transition focus:border-cyan focus:ring-2 focus:ring-cyan/30 placeholder:text-slate-400";
