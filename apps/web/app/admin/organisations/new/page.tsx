import { PageHeader } from "@/components/dashboard/page-header";
import { NewHeadOfficeForm } from "@/components/admin/new-head-office-form";

export const dynamic = "force-dynamic";

export default function NewHeadOfficePage() {
  return (
    <div>
      <PageHeader
        title="New Head Office"
        subtitle="Add a client group to the platform"
      />
      <NewHeadOfficeForm />
    </div>
  );
}
