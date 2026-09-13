import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/dal";
import { PasswordForm } from "./PasswordForm";
import ui from "../../admin.module.css";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage({ searchParams }: PageProps<"/admin/account">) {
  const user = await requireUser();
  const { changed } = await searchParams;

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>Account</h1>
          <p className={ui.subtitle}>{user.email}</p>
        </div>
      </header>
      <section className={ui.section} aria-labelledby="password-heading">
        <h2 id="password-heading" className={ui.sectionTitle}>
          Password
        </h2>
        <PasswordForm changed={changed === "1"} />
      </section>
    </>
  );
}
