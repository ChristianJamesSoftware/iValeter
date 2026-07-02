import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getServerApi } from "@/lib/trpc/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { OverdueJobsClient } from "@/components/org/overdue-jobs-client";

export const dynamic = "force-dynamic";

export default async function OverdueJobsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const api = await getServerApi();
  const [overdue, valeters] = await Promise.all([
    api.bookings.listOverdue(),
    api.users.listValeters(),
  ]);

  return (
    <div>
      <PageHeader
        title="Overdue Jobs"
        subtitle="Jobs not completed within 2 days — reassign or reschedule"
      />
      <OverdueJobsClient
        initialJobs={overdue.map((b) => ({
          id: b.id,
          vehicleReg: b.vehicleReg,
          customerName: b.customerName,
          status: b.status,
          readyByTime: b.readyByTime.toISOString(),
          rollCount: b.rollCount,
          lastRolledAt: b.lastRolledAt?.toISOString() ?? null,
          site: b.site,
          department: b.department,
          serviceType: b.serviceType,
          assignedTo: b.assignedTo,
        }))}
        valeters={valeters.map((v) => ({
          id: v.id,
          firstName: v.firstName,
          lastName: v.lastName,
          siteId: v.siteId ?? null,
        }))}
      />
    </div>
  );
}
