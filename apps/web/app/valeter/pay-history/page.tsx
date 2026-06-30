import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { PayHistoryClient } from "@/components/valeter/pay-history-client";

export const dynamic = "force-dynamic";

export default async function ValeterPayHistoryPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="px-5 pb-6 pt-8 text-white">
        <h1 className="font-heading text-2xl font-black">Pay History</h1>
        <p className="mt-1 text-sm text-white/50">Your submitted timesheets and approvals</p>
      </header>
      <PayHistoryClient />
    </div>
  );
}
