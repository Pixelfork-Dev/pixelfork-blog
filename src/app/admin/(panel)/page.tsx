import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, desc, eq, isNotNull, isNull, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { hasRole, requireUser } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import ui from "../admin.module.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const canReview = hasRole(user, "editor");
  // Contributors only see their own posts.
  const mine = canReview ? undefined : eq(schema.posts.createdById, user.id);

  // Drafts contributors have submitted, oldest first (editors/admins).
  const reviewQueue = canReview
    ? await db
        .select({ id: schema.posts.id, title: schema.posts.title, reviewRequestedAt: schema.posts.reviewRequestedAt, author: schema.authors.name })
        .from(schema.posts)
        .innerJoin(schema.authors, eq(schema.posts.authorId, schema.authors.id))
        .where(and(eq(schema.posts.status, "draft"), isNotNull(schema.posts.reviewRequestedAt)))
        .orderBy(asc(schema.posts.reviewRequestedAt))
    : [];

  const [byStatus, [{ value: userCount }], [{ value: tagCount }], recent] = await Promise.all([
    db.select({ status: schema.posts.status, value: count() }).from(schema.posts).where(mine).groupBy(schema.posts.status),
    db.select({ value: count() }).from(schema.users).where(isNull(schema.users.disabledAt)),
    db.select({ value: count() }).from(schema.tags),
    db
      .select({
        id: schema.posts.id,
        slug: schema.posts.slug,
        title: schema.posts.title,
        status: schema.posts.status,
        publishedAt: schema.posts.publishedAt,
        updatedAt: schema.posts.updatedAt,
        reviewRequestedAt: schema.posts.reviewRequestedAt,
        author: schema.authors.name,
      })
      .from(schema.posts)
      .innerJoin(schema.authors, eq(schema.posts.authorId, schema.authors.id))
      .where(mine)
      .orderBy(desc(schema.posts.updatedAt))
      .limit(6),
  ]);

  // SEO health: live posts with fixable problems, worst first.
  const livePosts = !canReview
    ? []
    : await db
    .select({
      id: schema.posts.id,
      title: schema.posts.title,
      excerpt: schema.posts.excerpt,
      seoDescription: schema.posts.seoDescription,
      coverSrc: schema.posts.coverSrc,
      coverAlt: schema.posts.coverAlt,
      content: schema.posts.content,
      noindex: schema.posts.noindex,
      focusKeyword: schema.posts.focusKeyword,
    })
    .from(schema.posts)
    .where(ne(schema.posts.status, "draft"));
  const seoIssues = livePosts
    .map((p) => {
      const issues: string[] = [];
      const description = p.seoDescription || p.excerpt;
      const words = p.content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      if (p.noindex) issues.push("hidden from search");
      if (description.length < 120) issues.push("short description");
      if (!p.coverSrc) issues.push("no cover");
      else if (!p.coverAlt) issues.push("cover without alt text");
      if (/<img(?![^>]*\balt="[^"]+")[^>]*>/i.test(p.content)) issues.push("images without alt text");
      if (words < 300) issues.push(`only ${words} words`);
      if (!p.focusKeyword) issues.push("no focus keyword");
      return { ...p, issues };
    })
    .filter((p) => p.issues.length > 0)
    .sort((a, b) => b.issues.length - a.issues.length)
    .slice(0, 8);

  const statusCount = (s: string) => byStatus.find((r) => r.status === s)?.value ?? 0;
  const stats = canReview
    ? [
        { label: "Waiting for review", value: reviewQueue.length },
        { label: "Published", value: statusCount("published") },
        { label: "Scheduled", value: statusCount("scheduled") },
        { label: "Drafts", value: statusCount("draft") },
        { label: "Tags", value: tagCount },
        { label: "Team members", value: userCount },
      ]
    : [
        { label: "My published posts", value: statusCount("published") + statusCount("scheduled") },
        { label: "My drafts", value: statusCount("draft") },
      ];

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>Welcome, {(user.name ?? user.email).split(" ")[0]}</h1>
          <p className={ui.subtitle}>Here’s what’s happening on the Pixelfork blog.</p>
        </div>
        <div className={ui.inlineForm}>
          <Link href="/admin/posts" className={ui.buttonGhost}>
            All posts
          </Link>
          <Link href="/admin/posts/new" className={ui.button}>
            New post
          </Link>
        </div>
      </header>

      <section className={ui.section} aria-label="Overview">
        <div className={ui.stats}>
          {stats.map((s) => (
            <div key={s.label} className={ui.stat}>
              <div className={ui.statValue}>{s.value}</div>
              <div className={ui.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {canReview && (
        <section className={ui.section} aria-labelledby="review-heading">
          <h2 id="review-heading" className={ui.sectionTitle}>
            Waiting for review ({reviewQueue.length})
          </h2>
          {reviewQueue.length === 0 ? (
            <p className={ui.muted}>Nothing to review. Drafts submitted by contributors appear here.</p>
          ) : (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Post</th>
                    <th>Author</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewQueue.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/posts/${p.id}`} className={ui.link}>
                          {p.title || "Untitled"}
                        </Link>
                      </td>
                      <td className={ui.muted}>{p.author}</td>
                      <td className={`${ui.muted} ${ui.nowrap}`}>{formatDate(p.reviewRequestedAt!.toISOString())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {canReview && (
      <section className={ui.section} aria-labelledby="seo-heading">
        <h2 id="seo-heading" className={ui.sectionTitle}>
          SEO health
        </h2>
        {seoIssues.length === 0 ? (
          <p className={`${ui.notice} ${ui.noticeOk}`}>All published posts pass the basic SEO checks.</p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Post</th>
                  <th>What to fix</th>
                </tr>
              </thead>
              <tbody>
                {seoIssues.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/admin/posts/${p.id}`} className={ui.link}>
                        {p.title}
                      </Link>
                    </td>
                    <td className={ui.muted}>{p.issues.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      )}

      <section className={ui.section} aria-labelledby="recent-heading">
        <h2 id="recent-heading" className={ui.sectionTitle}>
          {canReview ? "Recently updated" : "My recent posts"}
        </h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Author</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((post) => (
                <tr key={post.id}>
                  <td>
                    <Link href={`/admin/posts/${post.id}`} className={ui.link}>
                      {post.title || "Untitled"}
                    </Link>
                  </td>
                  <td>
                    <StatusBadge status={post.status} publishedAt={post.publishedAt} inReview={Boolean(post.reviewRequestedAt)} />
                  </td>
                  <td className={ui.muted}>{post.author}</td>
                  <td className={`${ui.muted} ${ui.nowrap}`}>{formatDate(post.updatedAt.toISOString())}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && <p className={ui.empty}>No posts yet.</p>}
        </div>
      </section>
    </>
  );
}
