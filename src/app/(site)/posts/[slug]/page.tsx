import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/Article/ArticleView";
import { JsonLd } from "@/components/JsonLd";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/posts";
import { buildPostMetadata, postJsonLd } from "@/lib/seo";

// Posts published after the build render on first request, then stay cached until the admin publishes a change.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const post = await getPostBySlug((await params).slug);
  return post ? buildPostMetadata(post) : {};
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const post = await getPostBySlug((await params).slug);
  if (!post) notFound();
  const related = await getRelatedPosts(post);

  return (
    <>
      <JsonLd data={postJsonLd(post)} />
      <ArticleView post={post} related={related} />
    </>
  );
}
