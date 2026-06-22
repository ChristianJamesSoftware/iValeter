import { HolidayClient } from "@/components/valeter/holiday-client";

export const dynamic = "force-dynamic";

export default function ValeterHolidayPage() {
  return (
    <div>
      <header className="bg-navy px-5 pb-6 pt-8 text-white">
        <h1 className="font-heading text-2xl font-bold">Holiday</h1>
        <p className="mt-1 text-sm text-white/70">
          Request time off and track approvals.
        </p>
      </header>
      <div className="p-4">
        <HolidayClient />
      </div>
    </div>
  );
}
