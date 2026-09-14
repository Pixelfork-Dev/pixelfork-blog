"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./panel.module.css";

type Role = "admin" | "editor" | "contributor";
const RANK: Record<Role, number> = { contributor: 1, editor: 2, admin: 3 };

const items: { href: string; label: string; min: Role }[] = [
  { href: "/admin", label: "Dashboard", min: "contributor" },
  { href: "/admin/posts", label: "Posts", min: "contributor" },
  { href: "/admin/media", label: "Media", min: "contributor" },
  { href: "/admin/tags", label: "Tags", min: "editor" },
  { href: "/admin/authors", label: "Authors", min: "editor" },
  { href: "/admin/redirects", label: "Redirects", min: "editor" },
  { href: "/admin/users", label: "Users", min: "admin" },
  { href: "/admin/api-tokens", label: "API tokens", min: "admin" },
];

const upcoming: string[] = [];

export function AdminNav({ role, reviewCount }: { role: Role; reviewCount: number }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className={styles.nav}>
      <ul>
        {items
          .filter((item) => RANK[role] >= RANK[item.min])
          .map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} className={styles.navLink} aria-current={active ? "page" : undefined}>
                  {item.label}
                  {item.href === "/admin/posts" && reviewCount > 0 && (
                    <span className={styles.navCount} aria-label={`${reviewCount} waiting for review`}>
                      {reviewCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
      </ul>
      {upcoming.length > 0 && <p className={styles.navHeading}>Coming soon</p>}
      <ul>
        {upcoming.map((label) => (
          <li key={label}>
            <span className={`${styles.navLink} ${styles.navDisabled}`}>{label}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
