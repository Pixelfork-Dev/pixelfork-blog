import Link from "next/link";
import type { Tag } from "@/lib/types";
import styles from "./TagBar.module.css";

/** The dashed category strip between the featured area and the grid. */
export function TagBar({ tags, activeSlug }: { tags: Tag[]; activeSlug?: string }) {
  return (
    <nav aria-label="Categories" className={`${styles.bar} dash-bottom`}>
      <div className="container">
        <ul className={styles.list}>
          {tags.map((tag) => {
            const active = tag.slug === activeSlug;
            return (
              <li key={tag.slug} className={styles.item}>
                <Link
                  href={`/tag/${tag.slug}`}
                  className={styles.link}
                  aria-current={active ? "page" : undefined}
                >
                  {tag.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
