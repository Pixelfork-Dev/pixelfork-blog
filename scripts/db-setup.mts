/**
 * Runs migrations, then imports the starter content if the database is empty.
 * Safe to run on every deploy: migrations are idempotent and the import only happens once.
 *
 *   npm run db:setup
 */
import fs from "node:fs/promises";
import path from "node:path";
import { count } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import matter from "gray-matter";

try {
  process.loadEnvFile(".env.local");
} catch {}

const { db, schema } = await import("../src/db/index.ts");
const { seedAuthor, seedTags } = await import("../seed/taxonomy.ts");

await migrate(db, { migrationsFolder: "drizzle" });
console.log("✓ migrations applied");

const [{ value: postCount }] = await db.select({ value: count() }).from(schema.posts);
const [{ value: tagCount }] = await db.select({ value: count() }).from(schema.tags);

if (postCount > 0 || tagCount > 0) {
  console.log(`✓ content already present (${postCount} posts, ${tagCount} tags) — skipping import`);
} else {
  await db.transaction(async (tx) => {
    const insertedTags = await tx
      .insert(schema.tags)
      .values(seedTags.map((t, i) => ({ ...t, sortOrder: i })))
      .returning({ id: schema.tags.id, slug: schema.tags.slug });
    const tagIds = new Map(insertedTags.map((t) => [t.slug, t.id]));

    const [author] = await tx.insert(schema.authors).values(seedAuthor).returning({ id: schema.authors.id });

    const dir = path.join(process.cwd(), "seed", "posts");
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const { data, content } = matter(await fs.readFile(path.join(dir, file), "utf8"));
      const publishedAt = new Date(data.publishedAt);
      const [post] = await tx
        .insert(schema.posts)
        .values({
          slug: file.replace(/\.md$/, ""),
          title: data.title,
          excerpt: data.excerpt,
          content: content.trim(),
          contentFormat: "markdown",
          status: data.draft ? "draft" : "published",
          featured: Boolean(data.featured),
          coverSrc: data.cover?.src,
          coverAlt: data.cover?.alt,
          coverWidth: data.cover?.width,
          coverHeight: data.cover?.height,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
          authorId: author.id,
          publishedAt,
          createdAt: publishedAt,
          updatedAt: data.updatedAt ? new Date(data.updatedAt) : publishedAt,
        })
        .returning({ id: schema.posts.id });

      const slugs: string[] = data.tags ?? [];
      if (slugs.length) {
        await tx.insert(schema.postTags).values(
          slugs.map((slug, position) => {
            const tagId = tagIds.get(slug);
            if (!tagId) throw new Error(`Unknown tag "${slug}" in ${file}`);
            return { postId: post.id, tagId, position };
          }),
        );
      }
    }
    console.log(`✓ imported ${files.length} posts, ${insertedTags.length} tags, 1 author`);
  });
}

process.exit(0);
