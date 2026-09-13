"use client";

import { useEffect, useId, useState } from "react";
import { ctaLink, mainNav } from "@/config/site";
import { SocialLinks } from "./SocialLinks";
import styles from "./MobileMenu.module.css";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={styles.root}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.bar} data-open={open} />
        <span className={styles.bar} data-open={open} />
      </button>

      <div
        id={panelId}
        className={`${styles.panel} dash-top`}
        hidden={!open}
        // Close when any link inside the panel is followed.
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
      >
        <nav aria-label="Mobile">
          <ul className={styles.links}>
            {mainNav.map((item) => (
              <li key={item.label} className="dash-bottom">
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.footer}>
          <SocialLinks />
          <a href={ctaLink.href} className={styles.cta}>
            {ctaLink.label}
          </a>
        </div>
      </div>
    </div>
  );
}
