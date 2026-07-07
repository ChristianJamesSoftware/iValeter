import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Time off requests have moved into the Messages page
export default function ValeterHolidayPage() {
  redirect("/valeter/messages");
}
