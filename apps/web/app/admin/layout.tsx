import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import type { NavItem } from "@/components/dashboard/app-sidebar";

const NAV: NavItem[] = [
  { href: "/admin", label: "Platform", icon: "building" },
  { href: "/org", label: "Operations", icon: "dashboard" },
  { href: "/org/team", label: "Team", icon: "team" },
  { href: "/org/holiday", label: "Holiday", icon: "holiday" },
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
