import { redirect } from "next/navigation";
import type { Role } from "@ivaleter/db";
import { getSession } from "@/lib/auth/session";
import { AppSidebar, type NavItem } from "./app-sidebar";
import { MobileNav } from "./mobile-nav";

/**
 * Server shell for desktop dashboards (admin / org / dealership).
 * Verifies the session role, renders the navy sidebar + content area.
 */
export async function DashboardShell({
  allow,
  items,
  children,
}: {
  allow: Role[];
  items: NavItem[];
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!allow.includes(session.role)) redirect("/");

  return (
    <div className="flex h-screen overflow-hidden bg-offwhite">
      <div className="hidden md:block">
        <AppSidebar
          items={items}
          user={{
            firstName: session.firstName,
            lastName: session.lastName,
            role: session.role,
          }}
        />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <MobileNav
          items={items}
          user={{
            firstName: session.firstName,
            lastName: session.lastName,
            role: session.role,
          }}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
