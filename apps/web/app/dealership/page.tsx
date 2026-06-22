import Link from "next/link";
import { ListChecks, Clock, Loader2, CheckCircle2, PlusCircle } from "lucide-react";
import { getServerApi } from "@/lib/trpc/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/brand/stat-card";
import { DealershipBookingList } from "@/components/dealership/booking-list";

export const dynamic = "force-dynamic";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function DealershipDashboard() {
  const api = await getServerApi();
  const [stats, bookings] = await Promise.all([
    api.analytics.statCards(),
    api.bookings.list({ dateFrom: startOfToday(), dateTo: endOfToday() }),
  ]);

  const jobs = bookings.map((b) => ({
    id: b.id,
    vehicleReg: b.vehicleReg,
    customerName: b.customerName,
    status: b.status,
    isPriority: b.isPriority,
    readyByTime: b.readyByTime.toISOString(),
    serviceType: { name: b.serviceType.name },
    department: b.department ? { name: b.department.name } : null,
    site: b.site ? { name: b.site.name } : null,
    assignedTo: b.assignedTo
      ? { firstName: b.assignedTo.firstName, lastName: b.assignedTo.lastName }
      : null,
  }));

  return (
    <div>
      <PageHeader
        title="Today's Operations"
        subtitle="Live bookings for your site"
        action={
          <Link
            href="/dealership/bookings/new"
            className="flex h-11 items-center gap-2 rounded-lg bg-cyan px-4 font-heading font-semibold text-navy transition hover:bg-cyan-600"
          >
            <PlusCircle className="h-5 w-5" />
            New Booking
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={ListChecks} title="Today's Total" value={stats.totalToday} accent="navy" />
        <StatCard icon={Clock} title="Pending" value={stats.pending} accent="warning" />
        <StatCard icon={Loader2} title="In Progress" value={stats.inProgress} accent="cyan" />
        <StatCard icon={CheckCircle2} title="Completed" value={stats.completedToday} accent="success" />
      </div>

      <h2 className="mb-3 font-heading text-lg font-bold text-navy">
        Today's bookings
      </h2>
      <DealershipBookingList initialJobs={jobs} />
    </div>
  );
}
