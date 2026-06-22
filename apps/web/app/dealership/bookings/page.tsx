import { PageHeader } from "@/components/dashboard/page-header";
import { BookingHistory } from "@/components/dealership/booking-history";

export const dynamic = "force-dynamic";

export default function DealershipBookingsPage() {
  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Full booking history for your site"
      />
      <BookingHistory />
    </div>
  );
}
