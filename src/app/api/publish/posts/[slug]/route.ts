import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { apiRoute, ApiError, authenticate } from "@/lib/api/tokens";
import { sanitizePostHtml } from "@/lib/sanitize";

/** Publishing API: check whether a slug is taken (so clients don't upload images for a duplicate). */
export const GET = apiRoute(async (request: Request, { params }: RouteContext<"/api/publish/posts/[slug]">) => {
  await authenticate(request, ["drafts:create", "covers:update"]);
  const { slug } = await params;
  const post = await db.query.posts.findFirst({ where: eq(schema.posts.slug, slug), columns: { status: true } });
  return NextResponse.json({ slug, exists: Boolean(post), status: post?.status ?? null });
});

const update = z.object({
  title: z.string().trim().min(10).max(120).optional(),
  excerpt: z.string().trim().min(50).max(300).optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(170).optional(),
  focusKeyword: z.string().trim().max(80).optional(),
  tags: z.array(z.string()).min(1).max(5).optional(),
  cover: z.object({ src: z.string().max(500).regex(/^(https:\/\/|\/)/), alt: z.string().trim().min(1).max(200), width: z.number().int().positive(), height: z.number().int().positive() }).optional(),
  html: z.string().min(500).max(300_000).optional(),
});

/**
 * Publishing API: replace the content of a draft this token created. Live posts are never touched —
 * an editor publishing the draft is always the last step.
 */
export const PUT = apiRoute(async (request: Request, { params }: RouteContext<"/api/publish/posts/[slug]">) => {
  const token = await authenticate(request, "drafts:create");
  const { slug } = await params;

  const parsed = update.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  const data = parsed.data;

  const post = await db.query.posts.findFirst({ where: eq(schema.posts.slug, slug) });
  if (!post) throw new ApiError(404, `No post with the slug "${slug}".`);
  if (post.status !== "draft") throw new ApiError(409, "This post is live. Only drafts can be updated through the API.");
  if (post.createdByTokenId !== token.id) throw new ApiError(403, "This draft was created by someone else.");

  const content = data.html ? sanitizePostHtml(data.html) : undefined;
  if (content) {
    const urls = [...content.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
    if (urls.length) {
      const known = new Set((await db.select({ url: schema.media.url }).from(schema.media).where(inArray(schema.media.url, urls))).map((r) => r.url));
      const unknown = urls.filter((u) => !known.has(u));
      if (unknown.length) throw new ApiError(400, `Upload images through /api/publish/media first: ${unknown.slice(0, 3).join(", ")}`);
    }
  }

  let tagRows: { id: string; slug: string }[] = [];
  if (data.tags) {
    tagRows = await db.select({ id: schema.tags.id, slug: schema.tags.slug }).from(schema.tags).where(inArray(schema.tags.slug, data.tags));
    const missing = data.tags.filter((t) => !tagRows.some((r) => r.slug === t));
    if (missing.length) throw new ApiError(400, `Unknown tags: ${missing.join(", ")}`);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(schema.posts)
      .set({
        ...(data.title ? { title: data.title } : {}),
        ...(data.excerpt ? { excerpt: data.excerpt } : {}),
        ...(data.seoTitle ? { seoTitle: data.seoTitle } : {}),
        ...(data.seoDescription ? { seoDescription: data.seoDescription } : {}),
        ...(data.focusKeyword ? { focusKeyword: data.focusKeyword } : {}),
        ...(content ? { content, contentFormat: "html" as const } : {}),
        ...(data.cover ? { coverSrc: data.cover.src, coverAlt: data.cover.alt, coverWidth: data.cover.width, coverHeight: data.cover.height } : {}),
        updatedById: token.createdById,
        updatedAt: new Date(),
      })
      .where(eq(schema.posts.id, post.id));
    if (data.tags) {
      await tx.delete(schema.postTags).where(eq(schema.postTags.postId, post.id));
      await tx.insert(schema.postTags).values(data.tags.map((s, position) => ({ postId: post.id, tagId: tagRows.find((t) => t.slug === s)!.id, position })));
    }
  });

  return NextResponse.json({ slug, status: "draft", editUrl: `/admin/posts/${post.id}` });
});
