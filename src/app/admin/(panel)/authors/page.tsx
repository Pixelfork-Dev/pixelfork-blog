import type { Metadata } from "next";
import Link from "next/link";
import { asc, count, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/dal";
import ui from "../../admin.module.css";

export const metadata: Metadata = { title: "Authors" };

export default async function AuthorsPage() {
  const me = await requireUser();
  const rows = await db
    .select({
      id: schema.authors.id,
      name: schema.authors.name,
      slug: schema.authors.slug,
      jobTitle: schema.authors.jobTitle,
      avatarUrl: schema.authors.avatarUrl,
      bio: schema.authors.bio,
      postCount: count(schema.posts.id),
      email: schema.users.email,
    })
    .from(schema.authors)
    .leftJoin(schema.posts, eq(schema.posts.authorId, schema.authors.id))
    .leftJoin(schema.users, eq(schema.users.authorId, schema.authors.id))
    .groupBy(schema.authors.id, schema.users.email)
    .orderBy(asc(schema.authors.name));

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>Authors</h1>
          <p className={ui.subtitle}>Bylines shown on articles. Each author with published posts gets a public profile page.</p>
        </div>
        <div className={ui.inlineForm}>
          {me.authorId && (
            <Link href={`/admin/authors/${me.authorId}`} className={ui.buttonGhost}>
              My profile
            </Link>
          )}
          <Link href="/admin/authors/new" className={ui.button}>
            New author
          </Link>
        </div>
      </header>
      <section className={ui.section}>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Author</th>
                <th>Profile</th>
                <th>Team member</th>
                <th>Posts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div className={ui.person}>
                      {a.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.avatarUrl} alt="" className={ui.avatar} referrerPolicy="no-referrer" />
                      ) : (
                        <span className={ui.avatarFallback}>{a.name.slice(0, 1)}</span>
                      )}
                      <div>
                        <Link href={`/admin/authors/${a.id}`} className={ui.link}>
                          {a.name}
                        </Link>
                        <div className={ui.muted}>{a.jobTitle ?? "—"}</div>
                      </div>
                    </div>
                  </td>
                  <td className={ui.muted}>
                    {!a.bio && <span className={`${ui.badge} ${ui.badgeDraft}`}>no bio</span>} /authors/{a.slug}
                  </td>
                  <td className={ui.muted}>{a.email ?? "Guest byline"}</td>
                  <td className={ui.muted}>{a.postCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
