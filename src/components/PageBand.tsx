import type { ReactNode } from "react";
import styles from "./PageBand.module.css";

/**
 * The band between the header and the first content row (88 → 169 in the design).
 * Empty on the home page; holds breadcrumbs and titles on inner pages.
 */
export function PageBand({ children }: { children?: ReactNode }) {
  return (
    <div className={`${styles.band} dash-bottom`} data-runner-track>
      <div className={`container ${styles.inner}`}>{children}</div>
    </div>
  );
}
