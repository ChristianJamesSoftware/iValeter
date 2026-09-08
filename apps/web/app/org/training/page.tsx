import { PageHeader } from "@/components/dashboard/page-header";
import { TrainingClient } from "@/components/org/training-client";

export const dynamic = "force-dynamic";

export default function TrainingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <TrainingClient />
    </div>
  );
}
