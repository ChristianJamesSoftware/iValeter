import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { TRPCError } from "@trpc/server";
import { getServerApi } from "@/lib/trpc/server";
import { DealershipDetail } from "@/components/admin/dealership-detail";

export const dynamic = "force-dynamic";

export default async function DealershipDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await getServerApi();

  let dealership;
  try {
    dealership = await api.dealerships.getById({ id });
  } catch (err) {
    if (err instanceof TRPCError && err.code === "NOT_FOUND") notFound();
    throw err;
  }

  return (
    <div>
      <Link
        href="/admin/dealerships"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate hover:text-navy"
      >
        <ChevronLeft className="h-4 w-4" /> All dealerships
      </Link>
      <DealershipDetail
        dealership={{
          id: dealership.id,
          name: dealership.name,
          address: dealership.address,
          contactName: dealership.contactName,
          contactEmail: dealership.contactEmail,
          contactPhone: dealership.contactPhone,
          isActive: dealership.isActive,
          sites: dealership.sites.map((s) => ({
            id: s.id,
            name: s.name,
            address: s.address,
            bookings: s._count.bookings,
            users: s._count.users,
          })),
        }}
      />
    </div>
  );
}
