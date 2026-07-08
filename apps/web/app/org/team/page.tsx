import { getServerApi } from "@/lib/trpc/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { TeamManager } from "@/components/org/team-manager";
import { BankChangeReview } from "@/components/org/bank-change-review";

export const dynamic = "force-dynamic";

export default async function OrgTeamPage() {
  const api = await getServerApi();
  const [valeters, sites] = await Promise.all([
    api.users.listValeters(),
    api.sites.list(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <PageHeader
          title="Valeting Team"
          subtitle="Your valeters across all sites"
        />
        <TeamManager
        initialValeters={valeters.map((v) => ({
          id: v.id,
          firstName: v.firstName,
          lastName: v.lastName,
          email: v.email,
          siteName: v.siteName,
          jobsToday: v.jobsToday,
          isActive: v.isActive,
          payId: v.payId,
          mobile: v.mobile,
          dailyRate: v.dailyRate,
          startDate: v.startDate,
          contractComplete: v.contractComplete,
        }))}
        sites={sites.map((s) => ({ id: s.id, name: s.name }))}
      />
      </div>

      {/* Bank details change requests — manager must call valeter before approving */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6">
        <BankChangeReview />
      </div>
    </div>
  );
}
