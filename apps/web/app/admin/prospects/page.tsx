import { PageHeader } from "@/components/dashboard/page-header";
import { ProspectsClient } from "@/components/shared/prospects-client";
import { getServerApi } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminProspectsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const api = await getServerApi();
  const sites = await api.sites.list();

  return (
    <div>
      <PageHeader
        title="Opportunities"
        subtitle="Manage valeter opportunities — collect prospects, track your pipeline and send area broadcasts"
      />
      <ProspectsClient sites={sites.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
