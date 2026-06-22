import { PageHeader } from "@/components/dashboard/page-header";
import { AdminSettingsClient } from "@/components/settings/admin-settings-client";

export const dynamic = "force-dynamic";

export default function AdminSettingsPage() {
  return (
    <div>
      <PageHeader
        title="Platform Settings"
        subtitle="Configure platform-wide options, integrations and feature flags"
      />
      <AdminSettingsClient />
    </div>
  );
}
