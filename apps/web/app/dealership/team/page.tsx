import { PageHeader } from "@/components/dashboard/page-header";
import { DealershipTeamClient } from "@/components/dealership/dealership-team-client";

export const dynamic = "force-dynamic";

export default function DealershipTeamPage() {
  return (
    <div>
      <PageHeader
        title="Team"
        subtitle="Manage the iValeter users at your dealership — salespeople, sales managers and heads of business."
      />
      <DealershipTeamClient />
    </div>
  );
}
