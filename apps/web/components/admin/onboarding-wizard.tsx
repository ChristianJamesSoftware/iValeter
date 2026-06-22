"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { trpc } from "@/lib/trpc/react";
import { cn } from "@/lib/utils";
import {
  PLANS,
  FEATURE_LABELS,
  planFeatures,
  type FeatureKey,
  type PlanKey,
} from "@ivaleter/api/plans";

const STEPS = ["Company", "Features", "Site", "Admin", "Review"];
const DEFAULT_DEPARTMENTS = ["New Car Sales", "Used Car Sales", "Service"];
const FEATURE_KEYS: FeatureKey[] = [
  "inspection",
  "photography",
  "freshScent",
  "paintProtection",
  "xero",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function OnboardingWizard() {
  const router = useRouter();
  const create = trpc.organisations.create.useMutation({
    onSuccess: (res) => {
      router.push(`/admin/organisations/${res.id}?created=1`);
      router.refresh();
    },
  });

  const [step, setStep] = useState(0);

  // Company
  const [name, setName] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slug, setSlug] = useState("");
  const [plan, setPlan] = useState<PlanKey>("starter");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Features
  const planAvailable = useMemo(() => new Set(planFeatures(plan)), [plan]);
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>({
    inspection: true,
    photography: false,
    freshScent: true,
    paintProtection: true,
    xero: false,
  });

  // Site
  const [siteName, setSiteName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);

  // Admin
  const [adminFirst, setAdminFirst] = useState("");
  const [adminLast, setAdminLast] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const effectiveSlug = slugTouched ? slug : slugify(name);

  const stepValid = [
    name.trim() && effectiveSlug,
    true,
    siteName.trim() && departments.length > 0,
    adminFirst.trim() && adminLast.trim() && /.+@.+\..+/.test(adminEmail),
    true,
  ][step];

  function submit() {
    create.mutate({
      name: name.trim(),
      slug: effectiveSlug,
      plan,
      contactEmail: contactEmail || "",
      contactPhone: contactPhone || undefined,
      features: {
        inspection: features.inspection && planAvailable.has("inspection"),
        photography: features.photography && planAvailable.has("photography"),
        freshScent: features.freshScent && planAvailable.has("freshScent"),
        paintProtection: features.paintProtection && planAvailable.has("paintProtection"),
        xero: features.xero && planAvailable.has("xero"),
      },
      site: {
        name: siteName.trim(),
        address: siteAddress || undefined,
        departments: departments.filter((d) => d.trim()),
      },
      admin: {
        firstName: adminFirst.trim(),
        lastName: adminLast.trim(),
        email: adminEmail.trim(),
      },
    });
  }

  return (
    <div className="max-w-2xl">
      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                i < step
                  ? "bg-cyan text-navy"
                  : i === step
                    ? "bg-navy text-white"
                    : "bg-line text-slate",
              )}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden text-sm font-semibold sm:block",
                i === step ? "text-navy" : "text-slate",
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      <div className="rounded-xl border border-line bg-white p-6">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-bold text-navy">Company details</h2>
            <Field label="Company name">
              <Input value={name} onChange={setName} placeholder="Total Valeting Ltd" />
            </Field>
            <Field label="Slug" hint="Used in URLs. Lowercase letters, numbers and dashes.">
              <Input
                value={effectiveSlug}
                onChange={(v) => {
                  setSlugTouched(true);
                  setSlug(slugify(v));
                }}
                placeholder="total-valeting"
              />
            </Field>
            <Field label="Plan">
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(PLANS) as PlanKey[]).map((k) => {
                  const p = PLANS[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setPlan(k)}
                      className={cn(
                        "rounded-lg border-2 p-3 text-left transition",
                        plan === k
                          ? "border-cyan bg-cyan/10 ring-2 ring-cyan/30"
                          : "border-line bg-white hover:border-cyan/50",
                      )}
                    >
                      <span className="block font-heading font-bold text-navy">{p.name}</span>
                      <span className="block text-sm text-cyan-600">
                        £{p.monthlyPriceGbp}/mo
                      </span>
                      <span className="block text-xs text-slate">
                        {p.maxSites === -1 ? "Unlimited sites" : `Up to ${p.maxSites} sites`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Contact email">
              <Input value={contactEmail} onChange={setContactEmail} type="email" />
            </Field>
            <Field label="Contact phone">
              <Input value={contactPhone} onChange={setContactPhone} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <h2 className="font-heading text-lg font-bold text-navy">Features</h2>
            <p className="text-sm text-slate">
              The <span className="font-semibold capitalize">{plan}</span> plan includes the
              features below. Greyed-out features need a higher plan.
            </p>
            {FEATURE_KEYS.map((k) => {
              const inPlan = planAvailable.has(k);
              return (
                <button
                  key={k}
                  type="button"
                  disabled={!inPlan}
                  onClick={() => setFeatures((f) => ({ ...f, [k]: !f[k] }))}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 text-left transition",
                    !inPlan
                      ? "border-line bg-offwhite opacity-50"
                      : features[k]
                        ? "border-cyan bg-cyan/10"
                        : "border-line bg-white",
                  )}
                >
                  <span className="font-semibold text-navy">{FEATURE_LABELS[k]}</span>
                  <span
                    className={cn(
                      "flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition",
                      features[k] && inPlan ? "bg-cyan" : "bg-line",
                    )}
                  >
                    <span
                      className={cn(
                        "h-5 w-5 rounded-full bg-white transition",
                        features[k] && inPlan && "translate-x-5",
                      )}
                    />
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-bold text-navy">First site</h2>
            <Field label="Site name">
              <Input value={siteName} onChange={setSiteName} placeholder="Head Office" />
            </Field>
            <Field label="Address">
              <Input value={siteAddress} onChange={setSiteAddress} />
            </Field>
            <Field label="Departments">
              <div className="space-y-2">
                {departments.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={d}
                      onChange={(v) =>
                        setDepartments((arr) => arr.map((x, idx) => (idx === i ? v : x)))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setDepartments((arr) => arr.filter((_, idx) => idx !== i))}
                      className="h-12 rounded-lg border border-line px-3 text-slate hover:bg-offwhite"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDepartments((arr) => [...arr, ""])}
                  className="text-sm font-semibold text-cyan-600"
                >
                  + Add department
                </button>
              </div>
            </Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-bold text-navy">Admin user</h2>
            <p className="text-sm text-slate">
              This person can sign in immediately with the temporary password{" "}
              <span className="font-mono font-bold">Welcome123!</span>
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <Input value={adminFirst} onChange={setAdminFirst} />
              </Field>
              <Field label="Last name">
                <Input value={adminLast} onChange={setAdminLast} />
              </Field>
            </div>
            <Field label="Email">
              <Input value={adminEmail} onChange={setAdminEmail} type="email" />
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-heading text-lg font-bold text-navy">Review &amp; create</h2>
            <Review label="Company" value={`${name} (${effectiveSlug})`} />
            <Review label="Plan" value={PLANS[plan].name} />
            <Review
              label="Features"
              value={
                FEATURE_KEYS.filter((k) => features[k] && planAvailable.has(k))
                  .map((k) => FEATURE_LABELS[k])
                  .join(", ") || "None"
              }
            />
            <Review
              label="Site"
              value={`${siteName} — ${departments.filter((d) => d.trim()).join(", ")}`}
            />
            <Review label="Admin" value={`${adminFirst} ${adminLast} · ${adminEmail}`} />
            {create.error && (
              <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {create.error.message}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="h-11 rounded-lg border border-line px-5 font-semibold text-navy transition hover:bg-offwhite disabled:opacity-40"
        >
          Back
        </button>
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!stepValid}
            className="h-11 rounded-lg bg-navy px-6 font-heading font-semibold text-white transition hover:bg-navy-600 disabled:opacity-50"
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={create.isPending}
            className="h-11 rounded-lg bg-cyan px-6 font-heading font-semibold text-navy transition hover:bg-cyan-600 disabled:opacity-60"
          >
            {create.isPending ? "Creating…" : "Create organisation"}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-navy">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate">{hint}</p>}
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
  placeholder?: string;
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

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="text-sm text-slate">{label}</span>
      <span className="text-right font-medium text-navy">{value}</span>
    </div>
  );
}
