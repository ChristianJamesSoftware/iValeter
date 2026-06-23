import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { NavItem } from "@/components/dashboard/app-sidebar";

const NAV: NavItem[] = [
  { href: "/org", label: "Ops Centre", icon: "ops", section: "Operations" },
  {
    href: "/org/recurring-bookings",
    label: "Recurring Bookings",
    icon: "recurring",
  },
  { href: "/org/team", label: "Team", icon: "team", section: "Team" },
  { href: "/org/dealership-team", label: "Dealership Team", icon: "team" },
  { href: "/org/attendance", label: "Attendance", icon: "attendance" },
  { href: "/org/holiday", label: "Holiday", icon: "holiday" },
  { href: "/org/training", label: "Training", icon: "training" },
  { href: "/org/compliance", label: "Compliance", icon: "compliance" },
  {
    href: "/org/payroll-deductions",
    label: "Pay Deductions",
    icon: "deductions",
    section: "Finance",
  },
  { href: "/org/billing", label: "Billing", icon: "billing" },
  { href: "/org/quote-builder", label: "Quote Builder", icon: "quote" },
  {
    href: "/org/reports",
    label: "Reports",
    icon: "reports",
    section: "Reporting",
  },
  {
    href: "/org/settings",
    label: "Settings",
    icon: "settings",
    section: "System",
  },
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
