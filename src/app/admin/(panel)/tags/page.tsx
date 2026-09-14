import type { Metadata } from "next";
import { asc, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRolePage } from "@/lib/auth/dal";
import { TagManager } from "./TagManager";
import ui from "../../admin.module.css";

export const metadata: Metadata = { title: "Tags" };

export default async function TagsPage() {
  await requireRolePage("editor");
  const rows = await db
    .select({
      id: schema.tags.id,
      name: schema.tags.name,
      slug: schema.tags.slug,
      description: schema.tags.description,
      postCount: count(schema.postTags.postId),
    })
    .from(schema.tags)
    .leftJoin(schema.postTags, eq(schema.postTags.tagId, schema.tags.id))
    .groupBy(schema.tags.id)
    .orderBy(asc(schema.tags.sortOrder), asc(schema.tags.name));

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>Tags</h1>
          <p className={ui.subtitle}>Tags group posts into sections. Each tag with published posts gets its own page and appears in the category bar.</p>
        </div>
      </header>
      <TagManager tags={rows} />
    </>
  );
}
