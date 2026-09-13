import { notFound } from "next/navigation";
import { getActiveTags, getPostsByAuthor, paginate } from "@/lib/posts";
import { authorJsonLd } from "@/lib/seo";
import type { Author } from "@/lib/types";
import { AuthorAvatar } from "./AuthorAvatar";
import { Breadcrumbs } from "./Breadcrumbs";
import { JsonLd } from "./JsonLd";
import { PageBand } from "./PageBand";
import { Pagination, pageHref } from "./Pagination";
import { PostGrid } from "./PostGrid";
import { TagBar } from "./TagBar";
import styles from "./AuthorIndex.module.css";

const LINK_LABELS: [RegExp, string][] = [
  [/(^|\.)x\.com|twitter\.com/, "X"],
  [/linkedin\.com/, "LinkedIn"],
  [/github\.com/, "GitHub"],
  [/youtube\.com/, "YouTube"],
  [/instagram\.com/, "Instagram"],
  [/itch\.io/, "itch.io"],
];

function linkLabel(url: string) {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return LINK_LABELS.find(([re]) => re.test(host))?.[1] ?? host;
}

export async function AuthorIndex({ author, page }: { author: Author; page: number }) {
  const [posts, tags] = await Promise.all([getPostsByAuthor(author.slug), getActiveTags()]);
  const { items, totalPages } = paginate(posts, page);
  // No live posts means no public page: avoids thin, empty profile pages in search.
  if (items.length === 0) notFound();

  const basePath = `/authors/${author.slug}`;
  const path = pageHref(basePath, page);
  const links = [author.url, ...author.sameAs].filter((u): u is string => Boolean(u));

  return (
    <>
      <JsonLd data={authorJsonLd(author, items, path)} />
      <PageBand>
        <Breadcrumbs
          items={[
            { name: "Blog", path: "/" },
            { name: page > 1 ? `${author.name} — Page ${page}` : author.name, path },
          ]}
        />
      </PageBand>
      <header className={`${styles.header} dash-bottom`}>
        <div className={`container ${styles.inner}`}>
          <AuthorAvatar author={author} size={96} priority />
          <div className={styles.text}>
            <h1 className={styles.name}>
              {author.name}
              {page > 1 && <span className={styles.page}> — Page {page}</span>}
            </h1>
            {author.role && <p className={styles.role}>{author.role}</p>}
            {author.bio && <p className={styles.bio}>{author.bio}</p>}
            {links.length > 0 && (
              <ul className={styles.links} aria-label={`${author.name} elsewhere`}>
                {links.map((url) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noopener noreferrer me" className={styles.link}>
                      {linkLabel(url)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className={styles.count}>
              {posts.length} {posts.length === 1 ? "article" : "articles"}
            </p>
          </div>
        </div>
      </header>
      <TagBar tags={tags} />
      <section aria-label={`Articles by ${author.name}`}>
        <PostGrid posts={items} priorityCount={3} />
      </section>
      <Pagination page={page} totalPages={totalPages} basePath={basePath} />
    </>
  );
}
