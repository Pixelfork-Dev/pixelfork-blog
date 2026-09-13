import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "../StatusBadge";
import ui from "../../admin.module.css";
import styles from "./posts.module.css";

export const metadata: Metadata = { title: "Posts" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
] as const;

export default async function PostsPage({ searchParams }: PageProps<"/admin/posts">) {
  await requireUser();
  const params = await searchParams;
  const status = FILTERS.some((f) => f.key === params.status) ? (params.status as string) : "all";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";

  const conditions: SQL[] = [];
  if (status === "published") conditions.push(sql`${schema.posts.status} <> 'draft'`);
  if (status === "draft") conditions.push(eq(schema.posts.status, "draft"));
  if (q) conditions.push(or(ilike(schema.posts.title, `%${q}%`), ilike(schema.posts.slug, `%${q}%`))!);

  const [rows, counts] = await Promise.all([
    db.query.posts.findMany({
      columns: { id: true, slug: true, title: true, status: true, featured: true, publishedAt: true, updatedAt: true },
      where: conditions.length ? and(...conditions) : undefined,
      // Drafts first (most recently edited), then published posts newest first.
      orderBy: [sql`${schema.posts.status} = 'draft' desc`, desc(schema.posts.publishedAt), desc(schema.posts.updatedAt)],
      with: {
        author: { columns: { name: true } },
        postTags: { with: { tag: { columns: { name: true } } }, orderBy: [asc(schema.postTags.position)] },
      },
    }),
    db.select({ status: schema.posts.status, value: count() }).from(schema.posts).groupBy(schema.posts.status),
  ]);

  const total = counts.reduce((n, c) => n + c.value, 0);
  const drafts = counts.find((c) => c.status === "draft")?.value ?? 0;
  const countFor = { all: total, published: total - drafts, draft: drafts } as Record<string, number>;
  const href = (next: { status?: string; q?: string }) => {
    const sp = new URLSearchParams();
    const s = next.status ?? status;
    const query = next.q ?? q;
    if (s !== "all") sp.set("status", s);
    if (query) sp.set("q", query);
    const str = sp.toString();
    return `/admin/posts${str ? `?${str}` : ""}`;
  };

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>Posts</h1>
          <p className={ui.subtitle}>Write, edit and publish articles.</p>
        </div>
        <Link href="/admin/posts/new" className={ui.button}>
          New post
        </Link>
      </header>

      <section className={ui.section}>
        <div className={styles.toolbar}>
          <nav aria-label="Filter by status" className={styles.filters}>
            {FILTERS.map((f) => (
              <Link key={f.key} href={href({ status: f.key })} className={styles.filter} aria-current={status === f.key ? "page" : undefined}>
                {f.label} <span className={ui.muted}>{countFor[f.key]}</span>
              </Link>
            ))}
          </nav>
          <form action="/admin/posts" className={ui.inlineForm} role="search">
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            <label className="sr-only" htmlFor="post-search">
              Search posts
            </label>
            <input id="post-search" name="q" defaultValue={q} placeholder="Search title or URL" className={ui.input} />
            <button type="submit" className={ui.buttonGhost}>
              Search
            </button>
          </form>
        </div>

        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Tags</th>
                <th>Author</th>
                <th>Published</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((post) => (
                <tr key={post.id}>
                  <td>
                    <Link href={`/admin/posts/${post.id}`} className={ui.link}>
                      {post.title || "Untitled"}
                    </Link>
                    {post.featured && <span className={ui.muted}> · Featured</span>}
                    <div className={`${ui.muted} ${styles.slug}`}>/posts/{post.slug}</div>
                  </td>
                  <td>
                    <StatusBadge status={post.status} publishedAt={post.publishedAt} />
                  </td>
                  <td className={ui.muted}>{post.postTags.map((pt) => pt.tag.name).join(", ") || "—"}</td>
                  <td className={`${ui.muted} ${ui.nowrap}`}>{post.author.name}</td>
                  <td className={`${ui.muted} ${ui.nowrap}`}>
                    {post.publishedAt && post.status !== "draft" ? formatDate(post.publishedAt.toISOString()) : "—"}
                  </td>
                  <td className={`${ui.muted} ${ui.nowrap}`}>{formatDate(post.updatedAt.toISOString())}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className={ui.empty}>
              {q ? `No posts match “${q}”.` : "No posts here yet."}{" "}
              <Link href="/admin/posts/new" className={ui.link}>
                Write one
              </Link>
            </p>
          )}
        </div>
      </section>
    </>
  );
}
