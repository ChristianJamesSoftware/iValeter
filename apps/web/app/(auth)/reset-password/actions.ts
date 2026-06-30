"use server";

import { redirect } from "next/navigation";
import { getServerApi } from "@/lib/trpc/server";

export interface ResetPasswordState {
  error: string | null;
  success: boolean;
}

export async function resetPasswordAction(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const token = String(formData.get("token") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "Invalid or missing reset token.", success: false };
  }
  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters.", success: false };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords don't match.", success: false };
  }

  try {
    const api = await getServerApi();
    await api.auth.resetPassword({ token, newPassword });
    redirect("/login?reset=1");
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Something went wrong. Please try again.";
    return { error: msg, success: false };
  }
}
