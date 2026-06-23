import { getServerApi } from "@/lib/trpc/server";
import { WeeklyCalendar } from "@/components/dealership/weekly-calendar";

export const dynamic = "force-dynamic";

export default async function DealershipCalendarPage() {
  const api = await getServerApi();
  const now = new Date();
  // Get Monday of current week
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const bookings = await api.bookings.list({ dateFrom: monday, dateTo: sunday });
  const jobs = bookings.map((b) => ({
    id: b.id,
    vehicleReg: b.vehicleReg,
    customerName: b.customerName,
    status: b.status,
    isPriority: b.isPriority,
    readyByTime: b.readyByTime.toISOString(),
    serviceType: { name: b.serviceType.name },
    department: b.department ? { name: b.department.name } : null,
    assignedTo: b.assignedTo
      ? { firstName: b.assignedTo.firstName, lastName: b.assignedTo.lastName }
      : null,
  }));

  return <WeeklyCalendar initialJobs={jobs} initialWeekOffset={0} />;
}
