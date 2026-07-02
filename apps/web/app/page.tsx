import { redirect } from "next/navigation";
import { roleHomePath } from "@ivaleter/api";
import { getSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirect("/home");
  redirect(roleHomePath(session.role));
}
