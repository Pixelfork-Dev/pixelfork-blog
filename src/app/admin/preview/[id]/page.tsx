import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArticleView } from "@/components/Article/ArticleView";
import { SiteChrome } from "@/components/SiteChrome";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { hasRole, requireUser } from "@/lib/auth/dal";
import { getPostPreview } from "@/lib/posts";
import styles from "./preview.module.css";

export const metadata: Metadata = { title: "Preview" };

/** Renders any post (including drafts) exactly as the public article page will. Admin-only, never indexed. */
export default async function PreviewPage({ params }: PageProps<"/admin/preview/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  if (!hasRole(user, "editor")) {
    const own = await db.query.posts.findFirst({ columns: { createdById: true }, where: eq(schema.posts.id, id) });
    if (own?.createdById !== user.id) notFound();
  }
  const post = await getPostPreview(id);
  if (!post) notFound();

  return (
    <>
      <div className={styles.banner} role="status">
        <span>Preview — this is how the post will look when published.</span>
        <a href={`/admin/posts/${id}`}>Back to editor</a>
      </div>
      <SiteChrome>
        <ArticleView post={post} />
      </SiteChrome>
    </>
  );
}
