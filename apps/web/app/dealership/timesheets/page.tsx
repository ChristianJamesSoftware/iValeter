import { PageHeader } from "@/components/dashboard/page-header";
import { DealerTimesheetsClient } from "@/components/dealership/dealer-timesheets-client";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DealerTimesheetsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div>
      <PageHeader
        title="Timesheet Approval"
        subtitle="Review and approve your valeting team's weekly hours"
      />
      <DealerTimesheetsClient />
    </div>
  );
}
