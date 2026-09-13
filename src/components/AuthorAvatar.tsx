import Image from "next/image";
import { assetPath } from "@/config/site";
import type { Author } from "@/lib/types";
import styles from "./AuthorAvatar.module.css";

/** Round avatar with an initial as fallback. Decorative: the name is always shown next to it. */
export function AuthorAvatar({ author, size, priority }: { author: Author; size: number; priority?: boolean }) {
  if (!author.avatar) {
    return (
      <span className={styles.fallback} style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
        {author.name.slice(0, 1)}
      </span>
    );
  }
  return (
    <Image
      src={author.avatar.startsWith("/") ? assetPath(author.avatar) : author.avatar}
      alt=""
      width={size}
      height={size}
      className={styles.avatar}
      style={{ width: size, height: size }}
      priority={priority}
    />
  );
}
