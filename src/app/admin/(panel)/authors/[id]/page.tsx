import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { hasRole, requireUser } from "@/lib/auth/dal";
import { AuthorForm } from "../AuthorForm";
import ui from "../../../admin.module.css";

export const metadata: Metadata = { title: "Author profile" };

export default async function AuthorEditPage({ params }: PageProps<"/admin/authors/[id]">) {
  const me = await requireUser();
  const { id } = await params;
  // Contributors can only edit their own byline.
  if (!hasRole(me, "editor") && id !== me.authorId) notFound();

  if (id === "new") {
    return (
      <>
        <header className={ui.pageHeader}>
          <div>
            <h1 className={ui.title}>New author</h1>
            <p className={ui.subtitle}>For guest writers or team bylines without an admin login.</p>
          </div>
        </header>
        <section className={ui.section}>
          <AuthorForm
            initial={{ name: "", slug: "", jobTitle: "", bio: "", avatarUrl: "", websiteUrl: "", sameAs: [] }}
            isOwnProfile={false}
            linkedEmail={null}
            postCount={0}
            googleImage={null}
          />
        </section>
      </>
    );
  }

  if (!z.uuid().safeParse(id).success) notFound();
  const [author, [{ value: postCount }], linked] = await Promise.all([
    db.query.authors.findFirst({ where: eq(schema.authors.id, id) }),
    db.select({ value: count() }).from(schema.posts).where(eq(schema.posts.authorId, id)),
    db.query.users.findFirst({ columns: { id: true, email: true, image: true }, where: eq(schema.users.authorId, id) }),
  ]);
  if (!author) notFound();
  const isOwnProfile = linked?.id === me.id;

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>{isOwnProfile ? "My profile" : author.name}</h1>
          <p className={ui.subtitle}>How this byline appears on articles and on its public author page.</p>
        </div>
      </header>
      <section className={ui.section}>
        <AuthorForm
          initial={{
            id: author.id,
            name: author.name,
            slug: author.slug,
            jobTitle: author.jobTitle ?? "",
            bio: author.bio ?? "",
            avatarUrl: author.avatarUrl ?? "",
            websiteUrl: author.websiteUrl ?? "",
            sameAs: author.sameAs,
          }}
          isOwnProfile={isOwnProfile}
          linkedEmail={linked?.email ?? null}
          postCount={postCount}
          googleImage={linked?.image ?? null}
        />
      </section>
    </>
  );
}
