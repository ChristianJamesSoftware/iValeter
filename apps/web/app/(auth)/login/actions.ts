"use server";

import { redirect } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { roleHomePath } from "@ivaleter/api";
import { getServerApi } from "@/lib/trpc/server";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/session";

export interface LoginState {
  error: string | null;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  let home: string;
  try {
    const api = await getServerApi();
    const session = await api.auth.login({ email, password });
    await setSessionCookie(session);
    home = roleHomePath(session.role);
  } catch (err) {
    if (err instanceof TRPCError && err.code === "UNAUTHORIZED") {
      return { error: "Invalid email or password" };
    }
    return { error: "Something went wrong. Please try again." };
  }

  redirect(home);
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
