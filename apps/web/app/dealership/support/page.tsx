import { PageHeader } from "@/components/dashboard/page-header";
import { SupportClient } from "@/components/dealership/support-client";

export default function SupportPage() {
  return (
    <div>
      <PageHeader
        title="Support"
        subtitle="FAQs and contact your account manager"
      />
      <SupportClient />
    </div>
  );
}
