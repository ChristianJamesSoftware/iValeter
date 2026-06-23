import { getImpersonation } from "@/lib/auth/session";
import { stopImpersonation } from "@/app/admin/impersonate/actions";

/** Persistent orange banner shown while a super_admin is impersonating a user. */
export async function ImpersonationBanner() {
  const ctx = await getImpersonation();
  if (!ctx) return null;

  const { impersonated } = ctx;
  return (
    <div className="flex items-center justify-center gap-3 bg-orange-500 px-4 py-2 text-sm font-medium text-white">
      <span>
        Viewing as {impersonated.firstName} {impersonated.lastName} (
        {impersonated.role.replace("_", " ")})
      </span>
      <form action={stopImpersonation}>
        <button
          type="submit"
          className="rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-white/30"
        >
          Exit
        </button>
      </form>
    </div>
  );
}
