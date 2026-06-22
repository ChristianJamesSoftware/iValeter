import { PageHeader } from "@/components/dashboard/page-header";
import { OnboardingWizard } from "@/components/admin/onboarding-wizard";

export const dynamic = "force-dynamic";

export default function NewOrganisationPage() {
  return (
    <div>
      <PageHeader
        title="New organisation"
        subtitle="Onboard a new valeting company onto iValeter"
      />
      <OnboardingWizard />
    </div>
  );
}
