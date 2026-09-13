import Image from "next/image";
import Link from "next/link";
import { signOut } from "@/auth";
import { assetPath } from "@/config/site";
import { requireUser } from "@/lib/auth/dal";
import { AdminNav } from "./AdminNav";
import ui from "../admin.module.css";
import styles from "./panel.module.css";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: assetPath("/admin/login") });
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Link href="/admin" aria-label="Admin dashboard">
            <Image src={assetPath("/logo.svg")} alt="Pixelfork" width={104} height={18} unoptimized />
          </Link>
          <span className={styles.brandTag}>Blog admin</span>
        </div>

        <AdminNav isAdmin={user.role === "admin"} />

        <div className={styles.account}>
          <div className={ui.person}>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className={ui.avatar} referrerPolicy="no-referrer" />
            ) : (
              <span className={ui.avatarFallback}>{(user.name ?? user.email).slice(0, 1)}</span>
            )}
            <div className={styles.accountText}>
              <span className={ui.strong}>{user.name ?? user.email}</span>
              <span className={`${ui.muted} ${styles.role}`}>{user.role}</span>
            </div>
          </div>
          <div className={styles.accountActions}>
            {user.authorId && (
              <Link href={`/admin/authors/${user.authorId}`} className={ui.buttonGhost}>
                My profile
              </Link>
            )}
            <Link href="/admin/account" className={ui.buttonGhost}>
              Account
            </Link>
            <a href={assetPath("/")} target="_blank" rel="noreferrer" className={ui.buttonGhost}>
              View blog
            </a>
            <form action={doSignOut}>
              <button type="submit" className={ui.buttonGhost}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  );
}
