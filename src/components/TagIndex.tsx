import { notFound } from "next/navigation";
import { getActiveTags, getPostsByTag, paginate } from "@/lib/posts";
import { tagJsonLd } from "@/lib/seo";
import type { Tag } from "@/lib/types";
import { Breadcrumbs } from "./Breadcrumbs";
import { JsonLd } from "./JsonLd";
import { PageBand } from "./PageBand";
import { Pagination, pageHref } from "./Pagination";
import { PostGrid } from "./PostGrid";
import { TagBar } from "./TagBar";
import styles from "./TagIndex.module.css";

export async function TagIndex({ tag, page }: { tag: Tag; page: number }) {
  const [posts, tags] = await Promise.all([getPostsByTag(tag.slug), getActiveTags()]);
  const { items, totalPages } = paginate(posts, page);
  if (items.length === 0) notFound();

  const basePath = `/tag/${tag.slug}`;
  const path = pageHref(basePath, page);

  return (
    <>
      <JsonLd data={tagJsonLd(tag, items, path)} />
      <PageBand>
        <Breadcrumbs
          items={[
            { name: "Blog", path: "/" },
            { name: page > 1 ? `${tag.name} — Page ${page}` : tag.name, path },
          ]}
        />
      </PageBand>
      <header className={`${styles.header} dash-bottom`}>
        <div className={`container ${styles.inner}`}>
          <h1 className={styles.title}>
            {tag.name}
            {page > 1 && <span className={styles.page}> — Page {page}</span>}
          </h1>
          <p className={styles.description}>{tag.description}</p>
          <p className={styles.count}>
            {posts.length} {posts.length === 1 ? "article" : "articles"}
          </p>
        </div>
      </header>
      <TagBar tags={tags} activeSlug={tag.slug} />
      <section aria-label={`${tag.name} articles`}>
        <PostGrid posts={items} priorityCount={3} />
      </section>
      <Pagination page={page} totalPages={totalPages} basePath={basePath} />
    </>
  );
}
