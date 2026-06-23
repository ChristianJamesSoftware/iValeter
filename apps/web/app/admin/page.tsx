import Link from "next/link";
import { Building2, MapPin, Users, ListChecks } from "lucide-react";
import { getServerApi } from "@/lib/trpc/server";
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
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-black tracking-tight text-slate-900">
          Platform Overview
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {me.organisationName} · Super Admin
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={MapPin} title="Sites" value={sites.length} accent="navy" />
        <StatCard icon={Users} title="Valeters" value={valeters.length} accent="cyan" />
        <StatCard icon={ListChecks} title="Total Bookings" value={totalBookings} accent="success" />
        <StatCard icon={Building2} title="Today" value={stats.totalToday} accent="warning" />
      </div>

      <h2 className="mb-4 font-heading text-lg font-black text-slate-900">
        Sites
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sites.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
            </div>
            {s.address && (
              <p className="mt-1 text-xs text-slate-400">{s.address}</p>
            )}
            <div className="mt-3 border-t border-slate-50 pt-3 text-xs text-slate-500">
              {s.departments.length} depts · {s._count.users} users ·{" "}
              {s._count.bookings} bookings
            </div>
            <Link
              href="/org"
              className="mt-2 inline-block text-xs font-semibold text-orange-500 hover:text-orange-600"
            >
              Open Operations →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
