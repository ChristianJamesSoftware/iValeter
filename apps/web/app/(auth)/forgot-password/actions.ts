"use server";

import { redirect } from "next/navigation";
import { getServerApi } from "@/lib/trpc/server";

export interface ForgotPasswordState {
  error: string | null;
  success: boolean;
}

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Please enter your email address.", success: false };
  }

  let resetToken: string | undefined;
  try {
    const api = await getServerApi();
    const result = await api.auth.forgotPassword({ email });
    const r = result as unknown as { resetToken?: string };
    resetToken = r.resetToken;
  } catch {
    // Always show success to prevent user enumeration
    return { error: null, success: true };
  }

  // Dev: if a token is returned, redirect straight to the reset page
  if (resetToken) {
    redirect(`/reset-password?token=${resetToken}`);
  }

  return { error: null, success: true };
}
