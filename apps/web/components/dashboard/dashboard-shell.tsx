import { redirect } from "next/navigation";
import type { Role } from "@ivaleter/db";
import { getSession } from "@/lib/auth/session";
import { AppSidebar, type NavItem } from "./app-sidebar";
import { MobileNav } from "./mobile-nav";
import { TopBar } from "./top-bar";
import { ImpersonationBanner } from "./impersonation-banner";

/**
 * Server shell for desktop dashboards (admin / org / dealership).
 * Verifies the session role, renders the sidebar + top bar + content area.
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

  const user = {
    firstName: session.firstName,
    lastName: session.lastName,
    role: session.role,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#fafafa]">
      <div className="hidden md:block">
        <AppSidebar items={items} user={user} />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <ImpersonationBanner />
        <MobileNav items={items} user={user} />
        <TopBar items={items} user={user} />
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
