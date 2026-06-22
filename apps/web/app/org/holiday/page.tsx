import { PageHeader } from "@/components/dashboard/page-header";
import { HolidayManager } from "@/components/org/holiday-manager";

export const dynamic = "force-dynamic";

export default function OrgHolidayPage() {
  return (
    <div>
      <PageHeader
        title="Holiday Management"
        subtitle="Approve or reject team leave requests"
      />
      <HolidayManager />
    </div>
  );
}
