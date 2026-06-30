import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { BookingHistory } from "@/components/dealership/booking-history";

export const dynamic = "force-dynamic";

export default function DealershipBookingsPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <PageHeader
          title="Bookings"
          subtitle="Manage and track all bookings for your site"
        />
        <Link
          href="/dealership/bookings/new"
          className="inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90 focus:outline-none focus:ring-2 focus:ring-cyan/40"
        >
          <Plus className="h-4 w-4" />
          New Booking
        </Link>
      </div>
      <BookingHistory />
    </div>
  );
}
