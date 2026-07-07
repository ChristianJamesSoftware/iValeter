import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ValeterBottomNav } from "@/components/valeter/bottom-nav";
import { SwRegister } from "@/components/valeter/sw-register";

export default async function ValeterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "valeter") redirect("/");

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-offwhite">
      <SwRegister />
      <div className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</div>
      <ValeterBottomNav />
    </div>
  );
}
