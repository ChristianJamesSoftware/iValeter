import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { NavItem } from "@/components/dashboard/app-sidebar";

const NAV: NavItem[] = [
  { href: "/org", label: "Operations", icon: "dashboard" },
  { href: "/org/team", label: "Team", icon: "team" },
  { href: "/org/holiday", label: "Holiday", icon: "holiday" },
  { href: "/org/settings", label: "Settings", icon: "settings" },
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
