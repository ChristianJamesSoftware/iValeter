import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { NavItem } from "@/components/dashboard/app-sidebar";

const NAV: NavItem[] = [
  { href: "/dealership", label: "Dashboard", icon: "dashboard" },
  { href: "/dealership/calendar", label: "Calendar", icon: "calendar" },
  { href: "/dealership/bookings/new", label: "New Booking", icon: "new" },
  { href: "/dealership/bookings", label: "Bookings", icon: "bookings" },
  { href: "/dealership/reports", label: "Reports", icon: "reports" },
  { href: "/dealership/support", label: "Support", icon: "support" },
];

export default function DealershipLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      allow={["dealership_user", "org_admin", "super_admin"]}
      items={NAV}
    >
      {children}
    </DashboardShell>
  );
}
