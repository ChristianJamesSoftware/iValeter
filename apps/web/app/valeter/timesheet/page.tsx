import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { TimesheetClient } from "@/components/valeter/timesheet-client";
import { OvertimeRequestClient } from "@/components/valeter/overtime-request-client";

export const dynamic = "force-dynamic";

export default async function ValeterTimesheetPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div>
      <header className="bg-slate-900 px-5 pb-6 pt-8 text-white">
        <h1 className="font-heading text-2xl font-black">Timesheet</h1>
        <p className="mt-1 text-sm text-white/50">This week · review and submit</p>
      </header>
      <div className="bg-slate-900 min-h-screen pt-4">
        <TimesheetClient />
        <div className="px-4">
          <div className="my-2 border-t border-white/10" />
          <p className="py-3 text-[10px] font-bold uppercase tracking-wider text-white/30">
            Overtime
          </p>
        </div>
        <OvertimeRequestClient />
      </div>
    </div>
  );
}
