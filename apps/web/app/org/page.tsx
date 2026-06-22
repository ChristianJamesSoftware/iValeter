import { getServerApi } from "@/lib/trpc/server";
import { OpsCentre } from "@/components/org/ops-centre";

export const dynamic = "force-dynamic";

export default async function OrgDashboard() {
  const api = await getServerApi();
  const [sites, valeters] = await Promise.all([
    api.sites.list(),
    api.users.listValeters(),
  ]);

  const siteOptions = sites.map((s) => ({ id: s.id, name: s.name }));
  const valeterOptions = valeters.map((v) => ({
    id: v.id,
    firstName: v.firstName,
    lastName: v.lastName,
    siteId: v.siteId,
    jobsToday: v.jobsToday,
    isActive: v.isActive,
  }));

  return <OpsCentre sites={siteOptions} valeters={valeterOptions} />;
}
