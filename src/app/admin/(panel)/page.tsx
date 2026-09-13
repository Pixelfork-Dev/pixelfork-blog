import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
import ui from "../admin.module.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  const [byStatus, [{ value: userCount }], [{ value: tagCount }], recent] = await Promise.all([
    db.select({ status: schema.posts.status, value: count() }).from(schema.posts).groupBy(schema.posts.status),
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
        author: schema.authors.name,
      })
      .from(schema.posts)
      .innerJoin(schema.authors, eq(schema.posts.authorId, schema.authors.id))
      .orderBy(desc(schema.posts.updatedAt))
      .limit(6),
  ]);

  const statusCount = (s: string) => byStatus.find((r) => r.status === s)?.value ?? 0;
  const stats = [
    { label: "Published", value: statusCount("published") },
    { label: "Scheduled", value: statusCount("scheduled") },
    { label: "Drafts", value: statusCount("draft") },
    { label: "Tags", value: tagCount },
    { label: "Team members", value: userCount },
  ];

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>Welcome, {(user.name ?? user.email).split(" ")[0]}</h1>
          <p className={ui.subtitle}>Here’s what’s happening on the Pixelfork blog.</p>
        </div>
        <Link href="/admin/posts" className={ui.buttonGhost}>
          All posts
        </Link>
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

      <section className={ui.section} aria-labelledby="recent-heading">
        <h2 id="recent-heading" className={ui.sectionTitle}>
          Recently updated
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
                  <td className={ui.strong}>{post.title}</td>
                  <td>
                    <StatusBadge status={post.status} publishedAt={post.publishedAt} />
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
