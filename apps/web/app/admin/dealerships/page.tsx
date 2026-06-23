import { PageHeader } from "@/components/dashboard/page-header";
import { DealershipsList } from "@/components/admin/dealerships-list";

export const dynamic = "force-dynamic";

export default function AdminDealershipsPage() {
  return (
    <div>
      <PageHeader
        title="Dealerships"
        subtitle="Dealer groups and their sites across the platform"
      />
      <DealershipsList />
    </div>
  );
}
