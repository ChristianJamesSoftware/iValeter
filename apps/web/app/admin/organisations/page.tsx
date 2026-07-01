import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { HeadOfficesList } from "@/components/admin/head-offices-list";

export const dynamic = "force-dynamic";

export default function AdminHeadOfficesPage() {
  return (
    <div>
      <PageHeader
        title="Head Offices"
        subtitle="Client groups and their dealerships"
        action={
          <Link
            href="/admin/organisations/new"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-cyan px-5 font-heading font-semibold text-navy transition hover:bg-cyan-600"
          >
            <PlusCircle className="h-5 w-5" /> New head office
          </Link>
        }
      />
      <HeadOfficesList />
    </div>
  );
}
