import Image from "next/image";
import Link from "next/link";
import { assetPath, ctaLink, mainNav, siteConfig } from "@/config/site";
import { MobileMenu } from "./MobileMenu";
import { SocialLinks } from "./SocialLinks";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={`${styles.header} dash-bottom`}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.left}>
          <Link href="/" className={styles.logo} aria-label={`${siteConfig.name} home`}>
            <Image src={assetPath(siteConfig.logo)} alt="Pixelfork" width={128} height={22} priority unoptimized />
          </Link>
          <nav aria-label="Main" className={styles.nav}>
            <ul>
              {mainNav.map((item) => (
                <li key={item.label}>
                  <a href={item.href} className={styles.navLink}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className={styles.right}>
          <SocialLinks className={styles.socials} />
          <a href={ctaLink.href} className={styles.cta}>
            {ctaLink.label}
          </a>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
