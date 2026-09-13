import Link from "next/link";
import type { Tag } from "@/lib/types";
import styles from "./TagChips.module.css";

export function TagChips({ tags, className = "" }: { tags: Tag[]; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <ul className={`${styles.list} ${className}`} aria-label="Tags">
      {tags.map((tag) => (
        <li key={tag.slug}>
          <Link href={`/tag/${tag.slug}`} className={styles.chip}>
            {tag.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
