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

  try {
    const api = await getServerApi();
    const result = await api.auth.forgotPassword({ email });

    // Dev/staging: if a token is returned, redirect straight to the reset page
    // Production: this would send an email instead and just show the success message
    if (result.resetToken) {
      redirect(`/reset-password?token=${result.resetToken}`);
    }

    return { error: null, success: true };
  } catch {
    // Always show success to prevent user enumeration
    return { error: null, success: true };
  }
}
