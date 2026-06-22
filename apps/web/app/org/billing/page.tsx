import { PageHeader } from "@/components/dashboard/page-header";
import { BillingClient } from "@/components/billing/billing-client";

export const dynamic = "force-dynamic";

export default function OrgBillingPage() {
  return (
    <div>
      <PageHeader
        title="Billing"
        subtitle="Invoices and Xero synchronisation"
      />
      <BillingClient />
    </div>
  );
}
