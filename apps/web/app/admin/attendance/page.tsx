import { PageHeader } from "@/components/dashboard/page-header";
import { AdminAttendanceClient } from "@/components/admin/admin-attendance-client";

export const dynamic = "force-dynamic";

export default function AdminAttendancePage() {
  return (
    <div>
      <PageHeader
        title="Attendance Approval"
        subtitle="Final super admin sign-off on timesheets. Only approved timesheets become visible to site managers."
      />
      <AdminAttendanceClient />
    </div>
  );
}
