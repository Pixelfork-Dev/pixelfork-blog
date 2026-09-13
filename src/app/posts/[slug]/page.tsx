import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { JsonLd } from "@/components/JsonLd";
import { PageBand } from "@/components/PageBand";
import { PostGrid } from "@/components/PostGrid";
import { ShareLinks } from "@/components/ShareLinks";
import { TableOfContents } from "@/components/TableOfContents";
import { TagChips } from "@/components/TagChips";
import { absoluteUrl, assetPath } from "@/config/site";
import { formatDate, formatReadingTime } from "@/lib/format";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/posts";
import { buildPostMetadata, postJsonLd } from "@/lib/seo";
import styles from "./page.module.css";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const post = await getPostBySlug((await params).slug);
  return post ? buildPostMetadata(post) : {};
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const post = await getPostBySlug((await params).slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post);
  const primaryTag = post.tags[0];
  const url = absoluteUrl(`/posts/${post.slug}`);
  const wasUpdated = post.updatedAt.slice(0, 10) !== post.publishedAt.slice(0, 10);

  return (
    <>
      <JsonLd data={postJsonLd(post)} />
      <PageBand>
        <Breadcrumbs
          items={[
            { name: "Blog", path: "/" },
            ...(primaryTag ? [{ name: primaryTag.name, path: `/tag/${primaryTag.slug}` }] : []),
            { name: post.title, path: `/posts/${post.slug}` },
          ]}
        />
      </PageBand>

      <article>
        <header className={`${styles.header} dash-bottom`}>
          <div className={`container ${styles.headerInner}`}>
            <TagChips tags={post.tags} />
            <h1 className={styles.title}>{post.title}</h1>
            <p className={styles.lead}>{post.excerpt}</p>
            <p className={styles.meta}>
              <span>
                By <span className={styles.author}>{post.author.name}</span>
              </span>
              <span aria-hidden="true">·</span>
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              <span aria-hidden="true">·</span>
              <span>{formatReadingTime(post.readingTimeMinutes)}</span>
              {wasUpdated && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
                  </span>
                </>
              )}
            </p>
            <figure className={styles.cover}>
              <Image
                src={assetPath(post.cover.src)}
                alt={post.cover.alt}
                fill
                priority
                sizes="(max-width: 940px) calc(100vw - 64px), 860px"
                className={styles.coverImage}
              />
            </figure>
          </div>
        </header>

        <div className={`container ${styles.layout}`}>
          <aside className={styles.aside}>
            <div className={styles.sticky}>
              {post.toc.length > 0 && <TableOfContents items={post.toc} />}
              <ShareLinks url={url} title={post.title} />
            </div>
          </aside>
          <div className={styles.prose} dangerouslySetInnerHTML={{ __html: post.html }} />
        </div>
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className={`${styles.related} dash-top`}>
          <div className={`${styles.relatedBar} dash-bottom`}>
            <div className="container">
              <h2 id="related-heading" className={styles.relatedTitle}>
                Related articles
              </h2>
            </div>
          </div>
          <PostGrid posts={related} headingLevel="h3" />
        </section>
      )}
    </>
  );
}
