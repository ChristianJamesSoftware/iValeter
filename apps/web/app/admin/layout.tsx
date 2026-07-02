import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { NavItem } from "@/components/dashboard/app-sidebar";

const NAV: NavItem[] = [
  // Platform
  { href: "/admin", label: "Dashboard", icon: "dashboard", section: "Platform" },
  { href: "/admin/network", label: "Customers", icon: "network" },
  { href: "/admin/team", label: "Valeting Team", icon: "team" },
  { href: "/admin/clients", label: "Customer Team", icon: "clients" },

  // Admin Tools
  { href: "/admin/quote-builder", label: "Quote Builder", icon: "quote", section: "Admin Tools" },

  // Finance
  { href: "/admin/attendance", label: "Attendance", icon: "attendance", section: "Finance" },
  { href: "/admin/payroll", label: "Payroll", icon: "deductions" },

  // Messaging
  { href: "/admin/broadcast", label: "Broadcast", icon: "messaging", section: "Messaging" },

  // Reporting
  { href: "/admin/reports", label: "Reports", icon: "reports", section: "Reporting" },

  // System
  { href: "/admin/impersonate", label: "Impersonate User", icon: "impersonate", accent: true, section: "System" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
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
