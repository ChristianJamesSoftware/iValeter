import { getServerApi } from "@/lib/trpc/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { DealershipTeamManager } from "@/components/org/dealership-team-manager";

export const dynamic = "force-dynamic";

export default async function DealershipTeamPage() {
  const api = await getServerApi();
  const sites = await api.sites.list();

  return (
    <div>
      <PageHeader
        title="Dealership Team"
        subtitle="Dealership staff who can access the booking portal"
      />
      <DealershipTeamManager sites={sites.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
