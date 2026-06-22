import { PageHeader } from "@/components/dashboard/page-header";
import { OrgSettingsClient } from "@/components/settings/org-settings-client";

export const dynamic = "force-dynamic";

export default function OrgSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Manage your organisation profile, sites, services and features"
      />
      <OrgSettingsClient />
    </div>
  );
}
