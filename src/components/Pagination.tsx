import Link from "next/link";
import styles from "./Pagination.module.css";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Base path; page 1 is `basePath`, page n is `${basePath}/page/n`. */
  basePath: string;
}

export function pageHref(basePath: string, page: number) {
  const base = basePath === "/" ? "" : basePath;
  return page <= 1 ? basePath : `${base}/page/${page}`;
}

export function Pagination({ page, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="container">
      <ul className={styles.list}>
        <li>
          {page > 1 ? (
            <Link href={pageHref(basePath, page - 1)} rel="prev" className={styles.step}>
              ← Newer
            </Link>
          ) : (
            <span className={`${styles.step} ${styles.disabled}`} aria-hidden="true">
              ← Newer
            </span>
          )}
        </li>
        {pages.map((p) => (
          <li key={p}>
            <Link
              href={pageHref(basePath, p)}
              className={styles.page}
              aria-current={p === page ? "page" : undefined}
              aria-label={`Page ${p}`}
            >
              {p}
            </Link>
          </li>
        ))}
        <li>
          {page < totalPages ? (
            <Link href={pageHref(basePath, page + 1)} rel="next" className={styles.step}>
              Older →
            </Link>
          ) : (
            <span className={`${styles.step} ${styles.disabled}`} aria-hidden="true">
              Older →
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
