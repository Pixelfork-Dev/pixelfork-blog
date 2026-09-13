import Image from "next/image";
import { assetPath, socialLinks } from "@/config/site";
import styles from "./SocialLinks.module.css";

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={`${styles.list} ${className}`}>
      {socialLinks.map((s) => (
        <li key={s.label}>
          <a
            href={s.href}
            className={styles.link}
            target="_blank"
            rel="noopener noreferrer me"
            aria-label={`Pixelfork on ${s.label}`}
          >
            <Image src={assetPath(s.icon)} alt="" width={24} height={24} unoptimized />
          </a>
        </li>
      ))}
    </ul>
  );
}
