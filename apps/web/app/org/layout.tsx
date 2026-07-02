import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { NavItem } from "@/components/dashboard/app-sidebar";

const NAV: NavItem[] = [
  { href: "/org", label: "Ops Centre", icon: "ops", section: "Operations" },
  {
    href: "/org/recurring-bookings",
    label: "Recurring Bookings",
    icon: "recurring",
  },
  { href: "/org/customers", label: "Customers", icon: "building", section: "Customers" },
  { href: "/org/team", label: "Valeting Team", icon: "team", section: "Team" },
  { href: "/org/dealership-team", label: "Customer Team", icon: "team" },
  { href: "/org/attendance", label: "Attendance", icon: "attendance" },
  { href: "/org/holiday", label: "Holiday", icon: "holiday" },
  { href: "/org/training", label: "Training", icon: "training" },
  { href: "/org/compliance", label: "Compliance", icon: "compliance" },
  {
    href: "/org/reports",
    label: "Reports",
    icon: "reports",
    section: "Reporting",
  },
  { href: "/org/quote-builder", label: "Quote Builder", icon: "quote", section: "Tools" },
];

export default function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell allow={["org_admin", "super_admin"]} items={NAV}>
      {children}
    </DashboardShell>
  );
}
