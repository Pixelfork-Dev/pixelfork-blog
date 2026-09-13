import { footerLinks, siteConfig } from "@/config/site";
import { SocialLinks } from "./SocialLinks";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={`${styles.footer} dash-top`}>
      <p className={styles.copy}>© {new Date().getFullYear()} {siteConfig.shortName} | All Rights Reserved</p>
      <SocialLinks />
      <nav aria-label="Legal">
        <ul className={styles.links}>
          {footerLinks.map((l) => (
            <li key={l.label}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
