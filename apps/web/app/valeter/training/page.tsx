import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { TrainingLaunchClient } from "./training-launch-client";

/**
 * Server component — reads the session and passes user details to the
 * client component that generates the SSO token and redirects.
 */
export default async function ValeterTrainingPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <TrainingLaunchClient
      email={session.email}
      name={`${session.firstName} ${session.lastName}`.trim()}
      role={session.role}
    />
  );
}
