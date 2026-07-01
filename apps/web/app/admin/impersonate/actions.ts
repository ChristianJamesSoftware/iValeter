"use server";

import { redirect } from "next/navigation";
import { roleHomePath, type SessionPayload } from "@ivaleter/api";
import type { Role } from "@ivaleter/db";
import {
  getRealSession,
  setImpersonationCookie,
  clearImpersonationCookie,
} from "@/lib/auth/session";

export interface ImpersonateInput {
  userId: string;
  organisationId: string;
  siteId: string | null;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
}

/** Begin impersonating a user. Only the genuine super_admin may do this. */
export async function startImpersonation(target: ImpersonateInput) {
  const real = await getRealSession();
  if (!real || real.role !== "super_admin") {
    throw new Error("Not authorised to impersonate users.");
  }

  const payload: SessionPayload = {
    userId: target.userId,
    organisationId: target.organisationId,
    siteId: target.siteId,
    role: target.role,
    email: target.email,
    firstName: target.firstName,
    lastName: target.lastName,
  };
  await setImpersonationCookie(payload);
  redirect(roleHomePath(target.role));
}

export async function stopImpersonation() {
  await clearImpersonationCookie();
  redirect("/admin/impersonate");
}

/** Clear impersonation and go back to the dealer preview selector. */
export async function switchDealer() {
  await clearImpersonationCookie();
  redirect("/admin/dealer-preview");
}
