import { getImpersonation } from "@/lib/auth/session";
import { stopImpersonation, switchDealer } from "@/app/admin/impersonate/actions";

/** Persistent orange banner shown while a super_admin is impersonating a user. */
export async function ImpersonationBanner() {
  const ctx = await getImpersonation();
  if (!ctx) return null;

  const { impersonated } = ctx;
  const isDealerRole =
    impersonated.role === "dealership_user" || impersonated.role === "org_admin";

  return (
    <div className="flex items-center justify-center gap-3 bg-orange-500 px-4 py-2 text-sm font-medium text-white">
      <span>
        Viewing as {impersonated.firstName} {impersonated.lastName} (
        {impersonated.role.replace("_", " ")})
      </span>

      {/* Switch to a different dealer without fully exiting */}
      {isDealerRole && (
        <form action={switchDealer}>
          <button
            type="submit"
            className="rounded-md bg-white/20 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-white/30"
          >
            Switch Dealer
          </button>
        </form>
      )}

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
