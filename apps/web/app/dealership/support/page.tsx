import { PageHeader } from "@/components/dashboard/page-header";
import { SupportClient } from "@/components/dealership/support-client";

export default function SupportPage() {
  return (
    <div>
      <PageHeader
        title="Support"
        subtitle="Contact your account manager or get help with the platform"
      />
      <SupportClient />
    </div>
  );
}
