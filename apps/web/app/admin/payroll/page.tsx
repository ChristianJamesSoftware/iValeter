import { PageHeader } from "@/components/dashboard/page-header";
import { PayrollTabs } from "@/components/admin/payroll-tabs";

export const dynamic = "force-dynamic";

function getMondayOfCurrentWeek(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0] ?? "";
}

export default function PayrollPage() {
  const weekStart = getMondayOfCurrentWeek();
  return (
    <div>
      <PageHeader
        title="Payroll"
        subtitle="Review timesheets, send to dealers, and export for payment"
      />
      <PayrollTabs initialWeekStart={weekStart} />
    </div>
  );
}
