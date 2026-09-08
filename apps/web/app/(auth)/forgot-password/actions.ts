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

    // Dev: if a token is returned (legacy), redirect straight to the reset page
    const r = result as unknown as { resetToken?: string };
    if (r.resetToken) {
      redirect(`/reset-password?token=${r.resetToken}`);
    }

    return { error: null, success: true };
  } catch {
    // Always show success to prevent user enumeration
    return { error: null, success: true };
  }
}
