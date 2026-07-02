import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { TRPCError } from "@trpc/server";
import { getServerApi } from "@/lib/trpc/server";
import { DealershipDetail } from "@/components/admin/dealership-detail";
import { startImpersonation } from "@/app/admin/impersonate/actions";

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

  // Find a dealership_user or org_admin to impersonate for the preview
  const allUsers = dealership.sites.flatMap((s) => s.users);
  const previewUser =
    allUsers.find((u) => u.role === "dealership_user") ??
    allUsers.find((u) => u.role === "org_admin") ??
    null;

  const previewAction = previewUser
    ? startImpersonation.bind(null, {
        userId: previewUser.id,
        organisationId: previewUser.organisationId,
        siteId: previewUser.siteId ?? null,
        role: previewUser.role as "dealership_user" | "org_admin",
        email: previewUser.email,
        firstName: previewUser.firstName,
        lastName: previewUser.lastName,
      })
    : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/admin/dealerships"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" /> All dealerships
        </Link>

        {/* Preview dealer view */}
        {previewAction ? (
          <form action={previewAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Preview as {previewUser!.firstName}
            </button>
          </form>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-400 cursor-not-allowed">
            <ExternalLink className="h-3.5 w-3.5" />
            No site user to preview as
          </span>
        )}
      </div>

      <DealershipDetail
        dealership={{
          id: dealership.id,
          name: dealership.name,
          address: dealership.address,
          contactName: dealership.contactName,
          contactEmail: dealership.contactEmail,
          contactPhone: dealership.contactPhone,
          specialInstructions: dealership.specialInstructions,
          isActive: dealership.isActive,
          organisation: dealership.organisation ?? null,
          accountsContactName:  dealership.accountsContactName  ?? null,
          accountsContactEmail: dealership.accountsContactEmail ?? null,
          accountsContactPhone: dealership.accountsContactPhone ?? null,
          paymentTermsDays: dealership.paymentTermsDays ?? null,
          paymentTermsNote: dealership.paymentTermsNote ?? null,
          creditLimit:      dealership.creditLimit      ?? null,
          sites: dealership.sites.map((s) => ({
            id: s.id,
            name: s.name,
            address: s.address,
            departments: s.departments.map((d) => ({
              id: d.id,
              name: d.name,
              serviceTypes: d.serviceTypes.map((st) => ({
                id: st.id,
                name: st.name,
                durationMins: st.durationMins,
              })),
            })),
            users: s.users.map((u) => ({
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
              role: u.role,
              payId: u.payId ?? null,
              staffType: u.staffType ?? null,
              siteId: u.siteId ?? null,
              email: u.email,
              organisationId: u.organisationId,
            })),
            vehicleSizeRates: s.vehicleSizeRates.map((r) => ({
              id: r.id,
              serviceType: { id: r.serviceType.id, name: r.serviceType.name },
              basePricePence: r.basePricePence ?? null,
              baseAllocMins: r.baseAllocMins ?? null,
              pctSmall: r.pctSmall,
              pctMedium: r.pctMedium,
              pctLarge: r.pctLarge,
              pctXL: r.pctXL,
              pctVan: r.pctVan,
            })),
            _count: { bookings: s._count.bookings, users: s._count.users },
          })),
        }}
      />
    </div>
  );
}
