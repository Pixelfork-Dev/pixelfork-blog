import Link from "next/link";
import { JsonLd } from "./JsonLd";
import { breadcrumbJsonLd } from "@/lib/seo";
import styles from "./Breadcrumbs.module.css";

export interface Crumb {
  name: string;
  path: string;
}

/** Visible breadcrumb trail + matching BreadcrumbList structured data. The last item is the current page. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(items)} />
      <nav aria-label="Breadcrumb">
        <ol className={styles.list}>
          {items.map((item, i) => {
            const last = i === items.length - 1;
            return (
              <li key={item.path} className={styles.item}>
                {last ? (
                  <span aria-current="page" className={styles.current}>
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.path}>{item.name}</Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
