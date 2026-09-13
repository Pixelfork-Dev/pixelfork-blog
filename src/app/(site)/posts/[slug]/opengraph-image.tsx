import { formatDate, formatReadingTime } from "@/lib/format";
import { ogSize, renderOgImage } from "@/lib/og";
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
  return renderOgImage({
    eyebrow: post?.tags[0]?.name ?? "Blog",
    title: post?.title ?? "Pixelfork Blog",
    footer: post ? `${formatDate(post.publishedAt)} · ${formatReadingTime(post.readingTimeMinutes)}` : "",
  });
}
