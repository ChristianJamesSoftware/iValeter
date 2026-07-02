import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { TRPCError } from "@trpc/server";
import { getServerApi } from "@/lib/trpc/server";
import { HeadOfficeDetail } from "@/components/admin/head-office-detail";

export const dynamic = "force-dynamic";

export default async function HeadOfficeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await getServerApi();

  let org;
  try {
    org = await api.organisations.getById({ id });
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  return (
    <div>
      <Link
        href="/admin/network"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> All head offices
      </Link>
      <HeadOfficeDetail
        headOffice={{
          id: org.id,
          name: org.name,
          address: org.billingAddress,
          contactEmail: org.contactEmail,
          contactPhone: org.contactPhone,
          isActive: org.isActive,
        }}
      />
    </div>
  );
}
