"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./panel.module.css";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/authors", label: "Authors" },
  { href: "/admin/users", label: "Users", adminOnly: true },
];

const upcoming: string[] = [];

export function AdminNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className={styles.nav}>
      <ul>
        {items
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} className={styles.navLink} aria-current={active ? "page" : undefined}>
                  {item.label}
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
