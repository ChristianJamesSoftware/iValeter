import { redirect } from "next/navigation";

// /valeter/jobs has no standalone list — the valeter home page IS the job list.
export default function ValeterJobsPage() {
  redirect("/valeter");
}
