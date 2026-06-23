import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { NavItem } from "@/components/dashboard/app-sidebar";

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "dashboard", section: "Platform" },
  { href: "/admin/organisations", label: "Organisations", icon: "building" },
  {
    href: "/admin/impersonate",
    label: "Impersonate User",
    icon: "impersonate",
    section: "Admin Tools",
    accent: true,
  },
  { href: "/admin/quote-builder", label: "Quote Builder", icon: "quote" },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: "reports",
    section: "Reporting",
  },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: "settings",
    section: "System",
  },
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
