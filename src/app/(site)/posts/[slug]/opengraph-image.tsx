import { ogSize, renderOgImage, renderPostOgImage } from "@/lib/og";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

export const alt = "Pixelfork Blog article";
export const size = ogSize;
export const contentType = "image/png";
export const dynamic = "force-static";

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPostBySlug((await params).slug);
  if (!post) return renderOgImage({ eyebrow: "Blog", title: "Pixelfork Blog", footer: "" });
  return renderPostOgImage({ cover: post.cover?.src ?? null, tag: post.tags[0]?.name ?? "Blog", title: post.title });
}
