import type { ReactNode } from "react";
import { ctaLink } from "@/config/site";
import styles from "./PageBand.module.css";

/**
 * The band between the header and the first content row (88 → 169 in the design).
 * Empty on the home page; holds breadcrumbs and titles on inner pages.
 * On desktop the "Create your own game" CTA stands on its dashed line as the pixel runner's obstacle.
 */
export function PageBand({ children }: { children?: ReactNode }) {
  return (
    <div className={`${styles.band} dash-bottom`} data-runner-track>
      <div className={`container ${styles.inner}`}>
        {children}
        <a href={ctaLink.href} className={styles.cta} data-runner-obstacle>
          {ctaLink.label}
        </a>
      </div>
    </div>
  );
}
