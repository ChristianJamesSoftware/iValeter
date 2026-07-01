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

  // Finance
  { href: "/admin/payroll", label: "Payroll", icon: "deductions", section: "Finance" },

  // Messaging
  { href: "/admin/broadcast", label: "Broadcast", icon: "messaging", section: "Messaging" },

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
