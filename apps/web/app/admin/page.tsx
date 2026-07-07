import { MapPin, Users, ListChecks, Clock } from "lucide-react";
import { getServerApi } from "@/lib/trpc/server";
import { StatCard } from "@/components/brand/stat-card";
import { PageHeader } from "@/components/dashboard/page-header";
import { HqCommandCentre } from "@/components/admin/hq-command-centre";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const api = await getServerApi();
  const [sites, valeters, stats, xeroConn] =
    await Promise.all([
      api.sites.list(),
      api.users.listValeters(),
      api.analytics.statCards(),
      api.xero.getConnection(),
    ]);

  const totalBookings = sites.reduce((acc, s) => acc + s._count.bookings, 0);

  return (
    <div>
      <PageHeader
        title="HQ Command Centre"
        subtitle="Platform-wide operations overview"
        action={
          xeroConn?.isActive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Xero connected
            </span>
          ) : (
            <a
              href="/admin/settings"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Xero not connected
            </a>
          )
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={MapPin} title="Sites" value={sites.length} accent="navy" />
        <StatCard
          icon={Users}
          title="Active Valeters"
          value={valeters.filter((v) => v.isActive).length}
          accent="cyan"
        />
        <StatCard
          icon={ListChecks}
          title="Today's Bookings"
          value={totalBookings}
          accent="success"
        />
        <StatCard
          icon={Clock}
          title="Today's Jobs"
          value={stats.totalToday}
          accent="warning"
        />
      </div>

      <HqCommandCentre />
    </div>
  );
}
