import Link from "next/link";
import { Building2, MapPin, Users, ListChecks } from "lucide-react";
import { getServerApi } from "@/lib/trpc/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/brand/stat-card";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const api = await getServerApi();
  const [me, sites, valeters, stats] = await Promise.all([
    api.auth.me(),
    api.sites.list(),
    api.users.listValeters(),
    api.analytics.statCards(),
  ]);

  const totalBookings = sites.reduce((acc, s) => acc + s._count.bookings, 0);

  return (
    <div>
      <PageHeader
        title="Platform Overview"
        subtitle={`${me.organisationName} · super admin`}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={MapPin} title="Sites" value={sites.length} accent="navy" />
        <StatCard icon={Users} title="Valeters" value={valeters.length} accent="cyan" />
        <StatCard icon={ListChecks} title="Total Bookings" value={totalBookings} accent="success" />
        <StatCard icon={Building2} title="Today" value={stats.totalToday} accent="warning" />
      </div>

      <h2 className="mb-3 font-heading text-lg font-bold text-navy">Sites</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sites.map((s) => (
          <div key={s.id} className="rounded-xl border border-line bg-white p-5">
            <h3 className="font-heading font-bold text-navy">{s.name}</h3>
            {s.address && <p className="text-sm text-slate">{s.address}</p>}
            <div className="mt-3 flex gap-4 text-sm text-slate">
              <span>{s.departments.length} departments</span>
              <span>{s._count.users} users</span>
              <span>{s._count.bookings} bookings</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Link
          href="/org"
          className="inline-flex h-11 items-center rounded-lg bg-navy px-5 font-heading font-semibold text-white transition hover:bg-navy-700"
        >
          Open Operations Centre
        </Link>
      </div>
    </div>
  );
}
