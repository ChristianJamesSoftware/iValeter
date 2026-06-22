import { getServerApi } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import { greeting, formatDate } from "@/lib/utils";
import { ValeterJobList } from "@/components/valeter/job-list";

export const dynamic = "force-dynamic";

export default async function ValeterHomePage() {
  const session = await getSession();
  const api = await getServerApi();
  const bookings = await api.bookings.list();

  // Serialise to plain data for the client component.
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
    includeInspection: b.includeInspection,
    inspectionComplete: b.inspectionComplete,
    includeFreshScent: b.includeFreshScent,
    paintProtectionTier: b.paintProtectionTier,
  }));

  return (
    <div>
      <header className="bg-navy px-5 pb-6 pt-8 text-white">
        <p className="text-sm text-white/70">{formatDate(new Date())}</p>
        <h1 className="font-heading text-2xl font-bold">
          {greeting()}, {session?.firstName}
        </h1>
        <p className="mt-1 text-sm text-white/70">
          You have {jobs.filter((j) => j.status !== "COMPLETED").length} active
          {jobs.filter((j) => j.status !== "COMPLETED").length === 1
            ? " job"
            : " jobs"}{" "}
          today.
        </p>
      </header>

      <div className="px-4 py-4">
        <ValeterJobList initialJobs={jobs} />
      </div>
    </div>
  );
}
