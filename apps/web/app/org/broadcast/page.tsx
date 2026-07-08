import { PageHeader } from "@/components/dashboard/page-header";
import { SmsBroadcast } from "@/components/org/sms-broadcast";

export const dynamic = "force-dynamic";

export default function BroadcastPage() {
  return (
    <div>
      <PageHeader
        title="SMS Broadcast"
        subtitle="Send text messages to your valeters via TotValeting"
      />
      <div className="max-w-2xl">
        <SmsBroadcast />
      </div>
    </div>
  );
}
