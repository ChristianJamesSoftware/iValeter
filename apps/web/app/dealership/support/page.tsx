import { PageHeader } from "@/components/dashboard/page-header";
import { SupportServicesClient } from "@/components/dealership/support-services-client";
import { SupportClient } from "@/components/dealership/support-client";

export default function SupportPage() {
  return (
    <div className="space-y-10">
      <div>
        <PageHeader
          title="CSI Support Services"
          subtitle="Request specialist cleaning — exterior, showroom, and workshop"
        />
        <SupportServicesClient />
      </div>
      <div>
        <PageHeader
          title="General Support"
          subtitle="Contact your account manager or get help with the platform"
        />
        <SupportClient />
      </div>
    </div>
  );
}
