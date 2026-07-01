import { getServerApi } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/dashboard/page-header";
import { ReportsDashboard } from "@/components/dealership/reports-dashboard";
import { ReportsPageTabs } from "@/components/dealership/reports-page-tabs";

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

  // Resolve site name for manager view
  const managerSite =
    session.siteId
      ? (sites.find((s) => s.id === session.siteId) ?? null)
      : null;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Bookings summary by period and department"
      />
      <ReportsPageTabs
        sites={visibleSites.map((s) => ({ id: s.id, name: s.name }))}
        defaultSiteId={session.siteId ?? visibleSites[0]?.id ?? ""}
        managerSiteId={managerSite?.id ?? null}
        managerSiteName={managerSite?.name ?? null}
      />
    </div>
  );
}
