import { getServerApi } from "@/lib/trpc/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { ComplianceClient } from "@/components/org/compliance-client";
import { ComplianceCalendar } from "@/components/org/compliance-calendar";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const api = await getServerApi();
  const [sites, managers] = await Promise.all([
    api.sites.list(),
    api.audits.listAccountManagers(),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <PageHeader
        title="Compliance"
        subtitle="Document tracking and account manager site visits"
      />

      {/* Site visit calendar */}
      <div>
        <h2 className="mb-4 font-heading text-lg font-black text-slate-900">
          Account Manager Visits
        </h2>
        <ComplianceCalendar
          sites={sites.map((s) => ({ id: s.id, name: s.name }))}
          initialManagers={managers}
        />
      </div>

      {/* Document compliance table */}
      <div>
        <h2 className="mb-4 font-heading text-lg font-black text-slate-900">
          Compliance Documents
        </h2>
        <ComplianceClient />
      </div>
    </div>
  );
}
