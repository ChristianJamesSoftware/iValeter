import { getServerApi } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ReportsDashboard } from "@/components/dealership/reports-dashboard";

export const dynamic = "force-dynamic";

export default async function DealershipReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const api = await getServerApi();
  const sites = await api.sites.list();

  const visibleSites =
    session.role === "dealership_user" && session.siteId
      ? sites.filter((s) => s.id === session.siteId)
      : sites;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Bookings summary by period and department"
      />
      <ReportsDashboard
        sites={visibleSites.map((s) => ({ id: s.id, name: s.name }))}
        defaultSiteId={session.siteId ?? visibleSites[0]?.id ?? ""}
      />
    </div>
  );
}
