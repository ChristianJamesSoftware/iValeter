import { getServerApi } from "@/lib/trpc/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { BroadcastClient } from "@/components/admin/broadcast-client";

export const dynamic = "force-dynamic";

export default async function BroadcastPage() {
  const api = await getServerApi();
  const [sites, sentMessages] = await Promise.all([
    api.sites.list(),
    api.messages.sent(),
  ]);

  return (
    <div>
      <PageHeader
        title="Broadcast"
        subtitle="Send messages to valeters, managers or customers"
      />
      <BroadcastClient
        sites={sites.map((s) => ({ id: s.id, name: s.name }))}
        initialSent={sentMessages.slice(0, 20)}
      />
    </div>
  );
}
