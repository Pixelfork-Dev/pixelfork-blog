import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { assetPath } from "@/config/site";
import { getCurrentUser } from "@/lib/auth/dal";
import { AuthForm } from "../login/AuthForm";
import styles from "../login/login.module.css";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/admin");

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <Image src={assetPath("/logo.svg")} alt="Pixelfork" width={128} height={22} unoptimized priority />
        <div>
          <h1 className={styles.title}>Create your account</h1>
          <p className={styles.text}>For invited team members. Use the email address your invitation was sent to.</p>
        </div>
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
