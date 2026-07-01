import { PageHeader } from "@/components/dashboard/page-header";
import { AdminDealershipsList } from "@/components/admin/admin-dealerships-list";

export const dynamic = "force-dynamic";

export default function AdminDealershipsPage() {
  return (
    <div>
      <PageHeader
        title="Dealerships"
        subtitle="All dealerships across every head office"
      />
      <AdminDealershipsList />
    </div>
  );
}
