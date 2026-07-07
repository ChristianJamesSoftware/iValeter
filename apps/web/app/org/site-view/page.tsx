import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServerApi } from "@/lib/trpc/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { SiteViewClient } from "@/components/org/site-view-client";

export const dynamic = "force-dynamic";

export default async function SiteViewPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const api = await getServerApi();
  const dealerships = await api.dealerships.list();

  return (
    <div>
      <PageHeader
        title="Site View"
        subtitle="Select a dealership to view their calendar and job history"
      />
      <SiteViewClient
        dealerships={dealerships.map((d) => ({
          id: d.id,
          name: d.name,
          sites: d.sites.map((s) => ({ id: s.id, name: s.name })),
        }))}
      />
    </div>
  );
}
