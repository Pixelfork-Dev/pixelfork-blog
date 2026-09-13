"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { assetPath } from "@/config/site";
import { registerAccount } from "@/lib/auth/access";

export interface AuthFormState {
  message: string;
  email?: string;
  name?: string;
}

const field = (formData: FormData, key: string) => String(formData.get(key) ?? "");

async function signInWithPassword(email: string, password: string) {
  // On success this throws Next's redirect, which must propagate.
  await signIn("password", { email, password, redirectTo: assetPath("/admin") });
}

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = field(formData, "email").trim();
  try {
    await signInWithPassword(email, field(formData, "password"));
    return { message: "" };
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        email,
        message: "Wrong email or password. After 5 failed attempts, sign-in is locked for 15 minutes.",
      };
    }
    throw error;
  }
}

export async function register(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = field(formData, "name").trim();
  const email = field(formData, "email").trim();
  const password = field(formData, "password");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { name, email, message: "Enter a valid email address." };
  if (password !== field(formData, "confirm")) return { name, email, message: "The passwords don’t match." };

  const result = await registerAccount({ name, email, password });
  if (!result.ok) return { name, email, message: result.message };
  await signInWithPassword(result.email, password);
  return { message: "" };
}
