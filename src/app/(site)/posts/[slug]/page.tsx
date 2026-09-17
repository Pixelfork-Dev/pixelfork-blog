import type { Metadata } from "next";
import { ArticleView } from "@/components/Article/ArticleView";
import { absoluteUrl } from "@/config/site";
import { JsonLd } from "@/components/JsonLd";
import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/lib/posts";
import { redirectOrNotFound } from "@/lib/redirects";
import { buildPostMetadata, faqJsonLd, notFoundMetadata, postJsonLd } from "@/lib/seo";

// Posts published after the build render on first request, then stay cached until the admin publishes a change.
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const post = await getPostBySlug((await params).slug);
  return post ? buildPostMetadata(post) : notFoundMetadata;
}

export default async function PostPage({ params }: PageProps<"/posts/[slug]">) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return redirectOrNotFound(`/posts/${slug}`);
  const related = await getRelatedPosts(post);
  const faq = faqJsonLd(post.html, absoluteUrl(`/posts/${post.slug}`));

  return (
    <>
      <JsonLd data={postJsonLd(post)} />
      {faq && <JsonLd data={faq} />}
      <ArticleView post={post} related={related} />
    </>
  );
}
