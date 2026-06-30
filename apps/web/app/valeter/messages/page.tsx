import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { MessagesClient } from "@/components/valeter/messages-client";

export const dynamic = "force-dynamic";

export default async function ValeterMessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="px-5 pb-6 pt-8 text-white">
        <h1 className="font-heading text-2xl font-black">Messages & Support</h1>
        <p className="mt-1 text-sm text-white/50">From your manager · help &amp; FAQ</p>
      </header>
      <MessagesClient meUserId={session.userId} />
    </div>
  );
}
