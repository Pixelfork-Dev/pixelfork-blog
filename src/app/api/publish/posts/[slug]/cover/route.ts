import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db, schema } from "@/db";
import { revalidatePublicSite } from "@/lib/admin/revalidate";
import { apiRoute, ApiError, authenticate } from "@/lib/api/tokens";

const input = z.object({
  src: z.string().max(500).regex(/^(https:\/\/|\/)/, "must be a media URL"),
  alt: z.string().trim().min(1).max(200),
});

/** Publishing API: replace a post's cover with an image uploaded through /api/publish/media. */
export const PUT = apiRoute(async (request: Request, { params }: RouteContext<"/api/publish/posts/[slug]/cover">) => {
  const token = await authenticate(request, "covers:update");
  const { slug } = await params;

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) throw new ApiError(400, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));

  const post = await db.query.posts.findFirst({ where: eq(schema.posts.slug, slug), columns: { id: true } });
  if (!post) throw new ApiError(404, `No post with the slug "${slug}".`);

  // Only images this token uploaded can become a cover.
  const media = await db.query.media.findFirst({ where: eq(schema.media.url, parsed.data.src) });
  if (!media || media.uploadedByTokenId !== token.id) throw new ApiError(400, "Upload the cover through /api/publish/media with this token first.");

  await db
    .update(schema.posts)
    .set({ coverSrc: media.url, coverAlt: parsed.data.alt, coverWidth: media.width, coverHeight: media.height, updatedAt: new Date() })
    .where(eq(schema.posts.id, post.id));
  if (!media.alt) await db.update(schema.media).set({ alt: parsed.data.alt }).where(eq(schema.media.id, media.id));
  revalidatePublicSite();

  return NextResponse.json({ slug, cover: media.url });
});
