import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdminDealershipsList } from "@/components/admin/admin-dealerships-list";

export const dynamic = "force-dynamic";

export default function AdminDealershipsPage() {
  return (
    <div>
      <PageHeader
        title="Dealerships"
        subtitle="All dealerships across every head office"
        action={
          <Link
            href="/admin/organisations"
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-white px-5 font-heading font-semibold text-navy transition hover:bg-offwhite"
          >
            Add via Head Office
          </Link>
        }
      />
      <AdminDealershipsList />
    </div>
  );
}
