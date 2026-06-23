import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { NavItem } from "@/components/dashboard/app-sidebar";

const NAV: NavItem[] = [
  // Platform
  { href: "/admin", label: "Dashboard", icon: "dashboard", section: "Platform" },
  { href: "/admin/dealerships", label: "Dealerships", icon: "building" },
  { href: "/admin/organisations", label: "Organisations", icon: "building" },

  // Admin Tools
  { href: "/admin/impersonate", label: "Impersonate User", icon: "impersonate", section: "Admin Tools", accent: true },
  { href: "/admin/quote-builder", label: "Quote Builder", icon: "quote" },

  // Operations
  { href: "/org", label: "Ops Centre", icon: "ops", section: "Operations" },
  { href: "/org/recurring-bookings", label: "Recurring Bookings", icon: "recurring" },

  // Team
  { href: "/org/team", label: "Team", icon: "team", section: "Team" },
  { href: "/org/attendance", label: "Attendance", icon: "attendance" },
  { href: "/org/holiday", label: "Holiday", icon: "holiday" },
  { href: "/org/training", label: "Training", icon: "training" },
  { href: "/org/compliance", label: "Compliance", icon: "compliance" },

  // Finance
  { href: "/org/payroll-deductions", label: "Pay Deductions", icon: "deductions", section: "Finance" },
  { href: "/org/billing", label: "Billing", icon: "billing" },

  // Reporting
  { href: "/admin/reports", label: "Reports", icon: "reports", section: "Reporting" },

  // System
  { href: "/admin/settings", label: "Settings", icon: "settings", section: "System" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell allow={["super_admin"]} items={NAV}>
      {children}
    </DashboardShell>
  );
}
