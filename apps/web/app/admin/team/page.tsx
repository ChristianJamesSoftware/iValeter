import { PageHeader } from "@/components/dashboard/page-header";
import { AdminTeamList } from "@/components/admin/admin-team-list";

export const dynamic = "force-dynamic";

export default function AdminTeamPage() {
  return (
    <div>
      <PageHeader
        title="Valeting Team"
        subtitle="All valeters across every site and organisation"
      />
      <AdminTeamList />
    </div>
  );
}
