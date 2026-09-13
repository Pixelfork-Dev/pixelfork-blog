import type { TocItem } from "@/lib/types";
import styles from "./TableOfContents.module.css";

export function TableOfContents({ items }: { items: TocItem[] }) {
  return (
    <nav aria-labelledby="toc-heading" className={styles.toc}>
      <h2 id="toc-heading" className={styles.heading}>
        On this page
      </h2>
      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.id} data-depth={item.depth}>
            <a href={`#${item.id}`}>{item.text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
