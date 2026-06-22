"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

interface Valeter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  siteName: string | null;
  jobsToday: number;
  isActive: boolean;
}
interface SiteOpt {
  id: string;
  name: string;
}

export function TeamManager({
  initialValeters,
  sites,
}: {
  initialValeters: Valeter[];
  sites: SiteOpt[];
}) {
  const [showForm, setShowForm] = useState(false);
  const list = trpc.users.listValeters.useQuery(undefined, {
    initialData: initialValeters as never,
  });
  const valeters = (list.data as unknown as Valeter[]) ?? initialValeters;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex h-11 items-center gap-2 rounded-lg bg-cyan px-4 font-heading font-semibold text-navy transition hover:bg-cyan-600"
        >
          <UserPlus className="h-5 w-5" />
          Add Valeter
        </button>
      </div>

      {showForm && (
        <AddValeterForm sites={sites} onDone={() => setShowForm(false)} />
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-line bg-offwhite text-xs uppercase text-slate">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Jobs Today</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {valeters.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate">
                  No valeters yet.
                </td>
              </tr>
            ) : (
              valeters.map((v) => (
                <tr key={v.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium text-navy">
                    {v.firstName} {v.lastName}
                  </td>
                  <td className="px-4 py-3 text-slate">{v.email}</td>
                  <td className="px-4 py-3 text-slate">{v.siteName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-navy/5 px-2 py-0.5 text-xs font-bold text-navy">
                      {v.jobsToday}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        v.isActive
                          ? "bg-success/15 text-success"
                          : "bg-slate/10 text-slate",
                      )}
                    >
                      {v.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AddValeterForm({
  sites,
  onDone,
}: {
  sites: SiteOpt[];
  onDone: () => void;
}) {
  const utils = trpc.useUtils();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");

  const create = trpc.users.create.useMutation({
    onSuccess: async () => {
      await utils.users.listValeters.invalidate();
      onDone();
    },
  });

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    password.length >= 6 &&
    !create.isPending;

  return (
    <div className="mb-4 rounded-xl border border-line bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading font-bold text-navy">New valeter</h2>
        <button onClick={onDone} className="rounded-lg p-1 hover:bg-offwhite">
          <X className="h-5 w-5 text-slate" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input value={firstName} onChange={setFirstName} placeholder="First name" />
        <Input value={lastName} onChange={setLastName} placeholder="Last name" />
        <Input value={email} onChange={setEmail} placeholder="Email" type="email" />
        <Input
          value={password}
          onChange={setPassword}
          placeholder="Password (min 6)"
          type="password"
        />
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className="h-12 rounded-lg border border-line bg-white px-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30 sm:col-span-2"
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      {create.error && (
        <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {create.error.message}
        </p>
      )}
      <button
        disabled={!canSubmit}
        onClick={() =>
          create.mutate({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            password,
            role: "valeter",
            siteId,
          })
        }
        className="mt-4 h-11 w-full rounded-lg bg-cyan font-heading font-semibold text-navy transition hover:bg-cyan-600 disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {create.isPending ? "Creating…" : "Create valeter"}
      </button>
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
    />
  );
}
