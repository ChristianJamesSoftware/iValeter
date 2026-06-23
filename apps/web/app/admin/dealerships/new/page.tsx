import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { DealershipForm } from "@/components/admin/dealerships-list";

export const dynamic = "force-dynamic";

export default function NewDealershipPage() {
  return (
    <div>
      <Link
        href="/admin/dealerships"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> All dealerships
      </Link>
      <PageHeader
        title="New dealership"
        subtitle="Add a dealer group HQ — you can attach sites afterwards"
      />
      <DealershipForm redirectOnDone />
    </div>
  );
}
