import { PageHeader } from "@/components/dashboard/page-header";
import { AdminClientsList } from "@/components/admin/admin-clients-list";

export const dynamic = "force-dynamic";

export default function AdminClientsPage() {
  return (
    <div>
      <PageHeader
        title="Customer Team"
        subtitle="All dealership portal users across every site"
      />
      <AdminClientsList />
    </div>
  );
}
