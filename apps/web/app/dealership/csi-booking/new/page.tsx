import { CsiBookingForm } from "@/components/dealership/csi-booking-form";
import { PageHeader } from "@/components/dashboard/page-header";

export default function NewCsiBookingPage() {
  return (
    <div>
      <PageHeader
        title="CSI Support Booking"
        subtitle="Book a specialist cleaning service for your site"
      />
      <CsiBookingForm />
    </div>
  );
}
