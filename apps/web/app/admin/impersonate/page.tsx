import { getServerApi } from "@/lib/trpc/server";
import { ImpersonateClient, type OrgUsers } from "@/components/admin/impersonate-client";

export const dynamic = "force-dynamic";

export default async function ImpersonatePage() {
  const api = await getServerApi();
  const [orgs, dealerships] = await Promise.all([
    api.organisations.list(),
    api.dealerships.listAllWithUsers(),
  ]);

  const detailed = await Promise.all(
    orgs.map((o) => api.organisations.getById({ id: o.id })),
  );

  const data: OrgUsers[] = detailed.map((org) => ({
    organisationId: org.id,
    organisationName: org.name,
    users: org.users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      siteId: null,
    })),
  }));

  return <ImpersonateClient orgs={data} dealerships={dealerships} />;
}
