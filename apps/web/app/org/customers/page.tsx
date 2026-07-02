import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServerApi } from "@/lib/trpc/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { OrgCustomersClient } from "@/components/org/org-customers-client";

export const dynamic = "force-dynamic";

export default async function OrgCustomersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const api = await getServerApi();
  const [dealerships, requests] = await Promise.all([
    api.dealerships.list(),
    api.dealershipRequests.list(),
  ]);

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Active dealerships and pending customer requests"
      />
      <OrgCustomersClient
        initialDealerships={dealerships.map((d) => ({
          id: d.id,
          name: d.name,
          address: d.address ?? null,
          contactName: d.contactName ?? null,
          contactEmail: d.contactEmail ?? null,
          contactPhone: d.contactPhone ?? null,
          siteCount: d._count?.sites ?? 0,
        }))}
        initialRequests={requests.map((r) => ({
          id: r.id,
          name: r.name,
          address: r.address ?? null,
          contactName: r.contactName ?? null,
          contactEmail: r.contactEmail ?? null,
          status: r.status,
          rejectionNote: r.rejectionNote ?? null,
          createdAt: r.createdAt.toISOString(),
          requestedBy: r.requestedBy
            ? `${r.requestedBy.firstName} ${r.requestedBy.lastName}`
            : null,
        }))}
      />
    </div>
  );
}
