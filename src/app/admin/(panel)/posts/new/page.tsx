import type { Metadata } from "next";
import { hasRole, requireUser } from "@/lib/auth/dal";
import { loadEditorOptions } from "../editor/data";
import { PostEditor } from "../editor/PostEditor";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const user = await requireUser();
  const { tags, authors } = await loadEditorOptions();

  return (
    <PostEditor
      tags={tags}
      authors={authors}
      canReview={hasRole(user, "editor")}
      post={{
        title: "",
        slug: "",
        excerpt: "",
        content: "",
        tagIds: [],
        // Default byline: the signed-in person's author profile.
        authorId: user.authorId ?? authors[0]?.id ?? "",
        featured: false,
        coverSrc: "",
        coverAlt: "",
        coverWidth: null,
        coverHeight: null,
        seoTitle: "",
        seoDescription: "",
        focusKeyword: "",
        canonicalUrl: "",
        noindex: false,
        status: "draft",
        createdById: user.id,
        reviewRequestedAt: null,
        reviewNote: null,
        hasPendingRevision: false,
        updatedAt: null,
        publishedAt: null,
      }}
    />
  );
}
