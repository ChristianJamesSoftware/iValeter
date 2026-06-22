import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { TRPCError } from "@trpc/server";
import { getServerApi } from "@/lib/trpc/server";
import { FEATURE_LABELS, type FeatureKey } from "@ivaleter/api/plans";

export const dynamic = "force-dynamic";

export default async function OrganisationDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const api = await getServerApi();

  let org;
  try {
    org = await api.organisations.getById({ id });
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  const features: Record<FeatureKey, boolean> = {
    inspection: org.featureInspection,
    photography: org.featurePhotography,
    freshScent: org.featureFreshScent,
    paintProtection: org.featurePaintProtection,
    xero: org.featureXero,
  };

  return (
    <div>
      <Link
        href="/admin/organisations"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> All organisations
      </Link>

      {created && (
        <div className="mb-6 rounded-xl border border-success bg-success/10 p-4 text-success">
          Organisation created. The admin can sign in with the temporary password{" "}
          <span className="font-mono font-bold">Welcome123!</span> and should change it
          immediately.
        </div>
      )}

      <div className="mb-6 flex items-center gap-3">
        <h1 className="font-heading text-3xl font-bold text-navy">{org.name}</h1>
        <span className="rounded-full bg-offwhite px-2.5 py-1 text-xs font-semibold capitalize text-navy">
          {org.plan}
        </span>
      </div>

      <section className="mb-6 rounded-xl border border-line bg-white p-5">
        <h2 className="mb-3 font-heading text-lg font-bold text-navy">Features</h2>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(features) as FeatureKey[]).map((k) => (
            <span
              key={k}
              className={
                features[k]
                  ? "rounded-full bg-cyan/10 px-3 py-1 text-sm font-semibold text-navy"
                  : "rounded-full bg-line px-3 py-1 text-sm font-semibold text-slate/60"
              }
            >
              {FEATURE_LABELS[k]}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-line bg-white p-5">
        <h2 className="mb-3 font-heading text-lg font-bold text-navy">Sites</h2>
        <ul className="space-y-2">
          {org.sites.map((s) => (
            <li key={s.id} className="flex items-center justify-between border-b border-line py-2 last:border-0">
              <span className="font-medium text-navy">{s.name}</span>
              <span className="text-sm text-slate">
                {s._count.users} staff · {s._count.bookings} bookings
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-line bg-white p-5">
        <h2 className="mb-3 font-heading text-lg font-bold text-navy">Users</h2>
        <ul className="space-y-2">
          {org.users.map((u) => (
            <li key={u.id} className="flex items-center justify-between border-b border-line py-2 last:border-0">
              <span className="font-medium text-navy">
                {u.firstName} {u.lastName}
              </span>
              <span className="text-sm text-slate">
                {u.email} · {u.role}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
