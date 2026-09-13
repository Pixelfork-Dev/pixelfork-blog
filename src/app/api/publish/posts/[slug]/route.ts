import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { apiRoute, authenticate } from "@/lib/api/tokens";

/** Publishing API: check whether a slug is taken (so clients don't upload images for a duplicate). */
export const GET = apiRoute(async (request: Request, { params }: RouteContext<"/api/publish/posts/[slug]">) => {
  await authenticate(request, ["drafts:create", "covers:update"]);
  const { slug } = await params;
  const post = await db.query.posts.findFirst({ where: eq(schema.posts.slug, slug), columns: { status: true } });
  return NextResponse.json({ slug, exists: Boolean(post), status: post?.status ?? null });
});
