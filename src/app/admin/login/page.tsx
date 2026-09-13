import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { devLoginEnabled, signIn } from "@/auth";
import { assetPath } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/dal";
import ui from "../admin.module.css";
import styles from "./login.module.css";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  AccessDenied: "This account doesn’t have access to the admin panel. Ask an admin to invite your email.",
  Configuration: "Sign-in isn’t configured correctly yet. Check the Google OAuth environment variables.",
  CredentialsSignin: "That email isn’t invited.",
};

export default async function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  if (await getCurrentUser()) redirect("/admin");
  const { error } = await searchParams;
  const message = typeof error === "string" ? (ERRORS[error] ?? "Sign-in failed. Please try again.") : null;
  const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/admin" });
  }

  async function devSignIn(formData: FormData) {
    "use server";
    if (!devLoginEnabled) return;
    try {
      await signIn("dev", { email: String(formData.get("email") ?? ""), redirectTo: "/admin" });
    } catch (e) {
      if (e instanceof AuthError) redirect("/admin/login?error=AccessDenied");
      throw e;
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Image src={assetPath("/logo.svg")} alt="Pixelfork" width={128} height={22} unoptimized priority />
        <div>
          <h1 className={styles.title}>Blog admin</h1>
          <p className={styles.text}>Sign in with your Pixelfork Google account.</p>
        </div>

        {message && (
          <p role="alert" className={`${ui.notice} ${ui.noticeError}`}>
            {message}
          </p>
        )}

        <form action={signInWithGoogle}>
          <button type="submit" className={`${ui.button} ${styles.full}`} disabled={!googleConfigured}>
            Continue with Google
          </button>
          {!googleConfigured && <p className={`${ui.notice} ${ui.muted}`}>Google login isn’t configured yet (AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET).</p>}
        </form>

        {devLoginEnabled && (
          <form action={devSignIn} className={styles.dev}>
            <p className={ui.sectionTitle}>Local development login</p>
            <div className={ui.inlineForm}>
              <input name="email" type="email" required placeholder="invited@email.com" className={`${ui.input} ${styles.grow}`} />
              <button type="submit" className={ui.buttonGhost}>
                Sign in
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
