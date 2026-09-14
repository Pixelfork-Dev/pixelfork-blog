import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { hasRole, requireUser } from "@/lib/auth/dal";
import { loadEditorOptions, loadEditorPost } from "../editor/data";
import { PostEditor } from "../editor/PostEditor";

export async function generateMetadata({ params }: PageProps<"/admin/posts/[id]">): Promise<Metadata> {
  const { id } = await params;
  const post = z.uuid().safeParse(id).success ? await loadEditorPost(id) : null;
  return { title: post ? `Edit: ${post.title || "Untitled"}` : "Post not found" };
}

export default async function EditPostPage({ params }: PageProps<"/admin/posts/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const [post, { tags, authors }] = await Promise.all([loadEditorPost(id), loadEditorOptions()]);
  if (!post) notFound();
  const canReview = hasRole(user, "editor");
  // Contributors only see their own posts.
  if (!canReview && post.createdById !== user.id) notFound();

  // key: remount only when switching to a different post, so saving keeps the cursor and messages.
  return <PostEditor key={post.id} post={post} tags={tags} authors={authors} canReview={canReview} />;
}
