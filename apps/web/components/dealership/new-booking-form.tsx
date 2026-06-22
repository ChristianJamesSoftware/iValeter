"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";

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
interface SiteOpt {
  id: string;
  name: string;
  departments: DeptOpt[];
}

function defaultReadyBy(): string {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  // round to nearest 5 min, format for datetime-local
  d.setMinutes(Math.round(d.getMinutes() / 5) * 5, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewBookingForm({ sites }: { sites: SiteOpt[] }) {
  const router = useRouter();
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [departmentId, setDepartmentId] = useState(
    sites[0]?.departments[0]?.id ?? "",
  );
  const [serviceTypeId, setServiceTypeId] = useState(
    sites[0]?.departments[0]?.serviceTypes[0]?.id ?? "",
  );
  const [vehicleReg, setVehicleReg] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [readyByTime, setReadyByTime] = useState(defaultReadyBy());
  const [isPriority, setIsPriority] = useState(false);

  const site = useMemo(() => sites.find((s) => s.id === siteId), [sites, siteId]);
  const departments = site?.departments ?? [];
  const department = departments.find((d) => d.id === departmentId);
  const serviceTypes = department?.serviceTypes ?? [];

  const create = trpc.bookings.create.useMutation({
    onSuccess: () => {
      router.push("/dealership");
      router.refresh();
    },
  });

  function onSiteChange(id: string) {
    setSiteId(id);
    const s = sites.find((x) => x.id === id);
    const d = s?.departments[0];
    setDepartmentId(d?.id ?? "");
    setServiceTypeId(d?.serviceTypes[0]?.id ?? "");
  }
  function onDeptChange(id: string) {
    setDepartmentId(id);
    const d = departments.find((x) => x.id === id);
    setServiceTypeId(d?.serviceTypes[0]?.id ?? "");
  }

  const canSubmit =
    siteId &&
    departmentId &&
    serviceTypeId &&
    vehicleReg.trim() &&
    customerName.trim() &&
    readyByTime &&
    !create.isPending;

  return (
    <div className="rounded-xl border border-line bg-white p-6">
      <div className="space-y-4">
        <Field label="Vehicle Registration">
          <input
            value={vehicleReg}
            onChange={(e) => setVehicleReg(e.target.value.toUpperCase())}
            placeholder="MK21 ABC"
            className="h-14 w-full rounded-lg border border-line bg-white px-4 font-heading text-2xl font-bold tracking-widest text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </Field>

        <Field label="Customer Name">
          <input
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="John Smith"
            className="h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </Field>

        {sites.length > 1 && (
          <Field label="Site">
            <Select value={siteId} onChange={onSiteChange}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Department">
          <Select value={departmentId} onChange={onDeptChange}>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Service Type">
          <Select value={serviceTypeId} onChange={setServiceTypeId}>
            {serviceTypes.map((st) => (
              <option key={st.id} value={st.id}>
                {st.name} ({st.durationMins}m)
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Ready By">
          <input
            type="datetime-local"
            value={readyByTime}
            onChange={(e) => setReadyByTime(e.target.value)}
            className="h-12 w-full rounded-lg border border-line bg-white px-4 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
          />
        </Field>

        <button
          type="button"
          onClick={() => setIsPriority((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 font-semibold transition",
            isPriority
              ? "border-danger bg-danger/10 text-danger"
              : "border-line bg-white text-slate",
          )}
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Mark as Priority
          </span>
          <span
            className={cn(
              "flex h-6 w-11 items-center rounded-full p-0.5 transition",
              isPriority ? "bg-danger" : "bg-line",
            )}
          >
            <span
              className={cn(
                "h-5 w-5 rounded-full bg-white transition",
                isPriority && "translate-x-5",
              )}
            />
          </span>
        </button>

        {create.error && (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {create.error.message}
          </p>
        )}

        <button
          disabled={!canSubmit}
          onClick={() =>
            create.mutate({
              siteId,
              departmentId,
              serviceTypeId,
              vehicleReg: vehicleReg.trim(),
              customerName: customerName.trim(),
              readyByTime: new Date(readyByTime),
              isPriority,
            })
          }
          className="h-14 w-full rounded-lg bg-cyan font-heading text-lg font-bold text-navy transition hover:bg-cyan-600 disabled:opacity-60"
        >
          {create.isPending ? "Creating…" : "Create Booking"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-navy">{label}</label>
      {children}
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-12 w-full rounded-lg border border-line bg-white px-3 text-navy outline-none focus:border-cyan focus:ring-2 focus:ring-cyan/30"
    >
      {children}
    </select>
  );
}
