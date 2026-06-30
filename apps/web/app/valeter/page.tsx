import { getServerApi } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { formatDate, greeting } from "@/lib/utils";
import { ValeterJobList } from "@/components/valeter/job-list";
import { ClockWidget } from "@/components/valeter/clock-widget";

export const dynamic = "force-dynamic";

export default async function ValeterHomePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const api = await getServerApi();
  const [bookings, sites] = await Promise.all([
    api.bookings.list(),
    api.sites.list(),
  ]);

  const jobs = bookings.map((b) => ({
    id: b.id,
    vehicleReg: b.vehicleReg,
    customerName: b.customerName,
    status: b.status,
    isPriority: b.isPriority,
    readyByTime: b.readyByTime.toISOString(),
    serviceType: { name: b.serviceType.name },
    department: b.department ? { name: b.department.name } : null,
    site: b.site ? { name: b.site.name } : null,
    includeInspection: b.includeInspection,
    inspectionComplete: b.inspectionComplete,
    includeFreshScent: b.includeFreshScent,
    paintProtectionTier: b.paintProtectionTier,
  }));

  // Get site geofence for the valeter's assigned site
  const assignedSite = session.siteId
    ? sites.find((s) => s.id === session.siteId)
    : null;
  const siteGeo = assignedSite
    ? {
        lat: (assignedSite as Record<string, unknown>).geofenceLat as number | null ?? null,
        lng: (assignedSite as Record<string, unknown>).geofenceLng as number | null ?? null,
        radiusMetres: ((assignedSite as Record<string, unknown>).geofenceRadiusMetres as number) ?? 200,
        siteName: assignedSite.name,
      }
    : null;

  return (
    <div>
      <header className="bg-slate-900 px-5 pb-6 pt-8 text-white">
        <p className="text-sm text-white/70">{formatDate(new Date())}</p>
        <h1 className="font-heading text-3xl font-black">
          {greeting()}, {session?.firstName}
        </h1>
        <p className="mt-1 text-sm font-semibold text-orange-400">
          {jobs.filter((j) => j.status !== "COMPLETED").length} active job
          {jobs.filter((j) => j.status !== "COMPLETED").length !== 1 ? "s" : ""} today
        </p>

        {/* Clock widget */}
        <div className="mt-5">
          <ClockWidget siteGeo={siteGeo} />
        </div>
      </header>

      <div className="px-4 py-4">
        <ValeterJobList initialJobs={jobs} />
      </div>
    </div>
  );
}
