import { redirect } from "next/navigation";
import { getServerApi } from "@/lib/trpc/server";
import { getSession } from "@/lib/auth/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { NewBookingForm } from "@/components/dealership/new-booking-form";

export const dynamic = "force-dynamic";

export default async function NewBookingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const api = await getServerApi();
  const sites = await api.sites.list();

  // Dealership users are pinned to their own site.
  const visibleSites =
    session.role === "dealership_user" && session.siteId
      ? sites.filter((s) => s.id === session.siteId)
      : sites;

  const formSites = visibleSites.map((s) => ({
    id: s.id,
    name: s.name,
    departments: s.departments.map((d) => ({
      id: d.id,
      name: d.name,
      serviceTypes: d.serviceTypes.map((st) => ({
        id: st.id,
        name: st.name,
        durationMins: st.durationMins,
      })),
    })),
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New Booking"
        subtitle="Create a valet job — fast"
      />
      <NewBookingForm sites={formSites} />
    </div>
  );
}
