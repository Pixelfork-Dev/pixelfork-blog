"use server";

import { signIn } from "@/auth";
import { assetPath } from "@/config/site";
import { changePassword } from "@/lib/auth/access";
import { assertRole, AuthorizationError } from "@/lib/auth/dal";

export interface PasswordState {
  ok: boolean;
  message: string;
}

export async function updatePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  let user;
  try {
    user = await assertRole("contributor");
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    throw e;
  }
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  if (next !== String(formData.get("confirm") ?? "")) return { ok: false, message: "The new passwords don’t match." };

  const problem = await changePassword(user, current, next);
  if (problem) return { ok: false, message: problem };

  // The change invalidated every session, including this one: sign in again with the new password.
  await signIn("password", { email: user.email, password: next, redirectTo: assetPath("/admin/account?changed=1") });
  return { ok: true, message: "Password updated." };
}
