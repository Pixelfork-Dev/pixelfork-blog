import type { ReactNode } from "react";
import { PixelRunner } from "./PixelRunner/PixelRunner";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import styles from "./SiteChrome.module.css";

/** Public site frame: dashed rails, header, content, pixel runner and footer. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className={styles.frame}>
        <SiteHeader />
        <main id="main" className={styles.main}>
          {children}
        </main>
        <PixelRunner />
      </div>
      <SiteFooter />
    </>
  );
}
