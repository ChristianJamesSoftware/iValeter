import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { OrganisationsList } from "@/components/admin/organisations-list";

export const dynamic = "force-dynamic";

export default function AdminOrganisationsPage() {
  return (
    <div>
      <PageHeader
        title="Organisations"
        subtitle="Valeting companies on the iValeter platform"
        action={
          <Link
            href="/admin/organisations/new"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-cyan px-5 font-heading font-semibold text-navy transition hover:bg-cyan-600"
          >
            <PlusCircle className="h-5 w-5" /> New organisation
          </Link>
        }
      />
      <OrganisationsList />
    </div>
  );
}
