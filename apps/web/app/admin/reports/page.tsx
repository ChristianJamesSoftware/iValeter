import { AdminReportsTabs } from "@/components/admin/admin-reports-tabs";
import { PageHeader } from "@/components/dashboard/page-header";

export default function AdminReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Platform-wide performance across all sites and valeters"
      />
      <AdminReportsTabs />
    </div>
  );
}
