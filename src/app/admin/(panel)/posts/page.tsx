import type { Metadata } from "next";
import { asc, desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "../StatusBadge";
import ui from "../../admin.module.css";

export const metadata: Metadata = { title: "Posts" };

export default async function PostsPage() {
  await requireUser();

  const rows = await db.query.posts.findMany({
    columns: { id: true, slug: true, title: true, status: true, featured: true, publishedAt: true, updatedAt: true },
    orderBy: [desc(schema.posts.publishedAt), desc(schema.posts.updatedAt)],
    with: {
      author: { columns: { name: true } },
      postTags: { with: { tag: { columns: { name: true } } }, orderBy: [asc(schema.postTags.position)] },
    },
  });

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>Posts</h1>
          <p className={ui.subtitle}>{rows.length} posts · Writing and editing arrive in the next phase.</p>
        </div>
        <button type="button" className={ui.button} disabled title="Coming in phase 2">
          New post
        </button>
      </header>

      <section className={ui.section}>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Title</th>
                <th>Status</th>
                <th>Tags</th>
                <th>Author</th>
                <th>Published</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((post) => {
                const live = post.publishedAt && post.status !== "draft" && post.publishedAt <= new Date();
                return (
                  <tr key={post.id}>
                    <td>
                      {live ? (
                        <a href={`/posts/${post.slug}`} target="_blank" rel="noreferrer" className={ui.link}>
                          {post.title}
                        </a>
                      ) : (
                        <span className={ui.strong}>{post.title}</span>
                      )}
                      {post.featured && <span className={ui.muted}> · Featured</span>}
                    </td>
                    <td>
                      <StatusBadge status={post.status} publishedAt={post.publishedAt} />
                    </td>
                    <td className={ui.muted}>{post.postTags.map((pt) => pt.tag.name).join(", ")}</td>
                    <td className={`${ui.muted} ${ui.nowrap}`}>{post.author.name}</td>
                    <td className={`${ui.muted} ${ui.nowrap}`}>
                      {post.publishedAt ? formatDate(post.publishedAt.toISOString()) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className={ui.empty}>No posts yet.</p>}
        </div>
      </section>
    </>
  );
}
