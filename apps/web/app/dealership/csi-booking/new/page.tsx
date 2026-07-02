import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { CsiBookingForm } from "@/components/dealership/csi-booking-form";
import { PageHeader } from "@/components/dashboard/page-header";

export const dynamic = "force-dynamic";

export default async function NewCsiBookingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="CSI Support Booking"
        subtitle="Book a specialist cleaning service for your site"
      />
      <CsiBookingForm />
    </div>
  );
}
