import { PageHeader } from "@/components/dashboard/page-header";
import { NetworkClient } from "@/components/admin/network-client";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function NetworkPage() {
  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle="Head offices and their dealerships"
        action={
          <Link
            href="/admin/organisations/new"
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-cyan px-5 font-heading font-semibold text-navy transition hover:bg-cyan-600"
          >
            <PlusCircle className="h-5 w-5" /> New head office
          </Link>
        }
      />
      <NetworkClient />
    </div>
  );
}
