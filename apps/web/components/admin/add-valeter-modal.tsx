"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc/react";

/**
 * Add a valeter from the internal admin side.
 *
 * A valeter does NOT have to be tied to a site. Recording the town or area they
 * are based in is enough to get them onto the platform; a site can be assigned
 * later if and when they start covering one.
 */
export function AddValeterModal({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    town: "",
    siteId: "",
  });

  // Paused sites still need to be selectable pre-launch
  const sitesQ = trpc.sites.listAllAdmin.useQuery({ showInactive: true });
  const sites = sitesQ.data ?? [];

  const create = trpc.users.create.useMutation({
    onSuccess: async () => {
      await utils.users.listAllValeters.invalidate();
      onClose();
    },
  });

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSubmit =
    !create.isPending &&
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    form.email.trim() !== "";

  function submit() {
    if (!canSubmit) return;
    create.mutate({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim() || undefined,
      town: form.town.trim() || undefined,
      siteId: form.siteId || undefined,
      role: "valeter",
    });
  }

  const rawError = create.error?.message ?? "";
  const errorText = /FORBIDDEN|UNAUTHORIZED|permission/i.test(rawError)
    ? "You do not have permission to add valeters. If you have recently been given access, log out and back in, then try again."
    : rawError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Add valeter</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              A site is optional — the town or area is enough to get them on the platform.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <input className={INPUT} value={form.firstName} onChange={set("firstName")} autoFocus />
            </Field>
            <Field label="Last name" required>
              <input className={INPUT} value={form.lastName} onChange={set("lastName")} />
            </Field>
          </div>

          <Field label="Email address" required>
            <input className={INPUT} type="email" value={form.email} onChange={set("email")} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mobile number">
              <input className={INPUT} value={form.mobile} onChange={set("mobile")} />
            </Field>
            <Field label="Town or area">
              <input
                className={INPUT}
                value={form.town}
                onChange={set("town")}
                placeholder="e.g. Milton Keynes"
              />
            </Field>
          </div>

          <Field label="Assign to site (optional)">
            <select className={INPUT} value={form.siteId} onChange={set("siteId")}>
              <option value="">— Not tied to a site —</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.isActive ? "" : " (paused)"}
                </option>
              ))}
            </select>
          </Field>

          <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
            The valeter is created with a pay reference and will be sent a link to set their own
            password. They cannot log in until their account is activated.
          </p>

          {errorText && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {errorText}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {create.isPending ? "Adding…" : "Add valeter"}
            </button>
          </div>
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
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500";
