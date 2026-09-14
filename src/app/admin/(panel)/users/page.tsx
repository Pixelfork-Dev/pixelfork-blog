import type { Metadata } from "next";
import { sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAdminPage } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { InviteForm } from "./InviteForm";
import { UserControls } from "./UserControls";
import ui from "../../admin.module.css";

export const metadata: Metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireAdminPage();
  const users = await db
    .select()
    .from(schema.users)
    // Active people first (most recent sign-in on top), then pending invites, then deactivated accounts.
    .orderBy(
      sql`${schema.users.disabledAt} is not null`,
      sql`${schema.users.lastLoginAt} desc nulls last`,
      schema.users.email,
    );

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>Users</h1>
          <p className={ui.subtitle}>
            Invite-only. Invited people create their account (email + password) at /blog/admin/register. Admins manage people and everything else; editors manage and publish content; contributors write drafts and submit them for review.
          </p>
        </div>
      </header>

      <section className={ui.section} aria-labelledby="invite-heading">
        <h2 id="invite-heading" className={ui.sectionTitle}>
          Invite someone
        </h2>
        <InviteForm />
      </section>

      <section className={ui.section} aria-labelledby="team-heading">
        <h2 id="team-heading" className={ui.sectionTitle}>
          Team ({users.length})
        </h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Person</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last sign-in</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={ui.person}>
                      {u.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.image} alt="" className={ui.avatar} referrerPolicy="no-referrer" />
                      ) : (
                        <span className={ui.avatarFallback}>{(u.name ?? u.email).slice(0, 1)}</span>
                      )}
                      <div>
                        <div className={ui.strong}>{u.name ?? "—"}</div>
                        <div className={ui.muted}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${ui.badge} ${u.role === "admin" ? ui.badgeAdmin : ""}`}>{u.role}</span>
                  </td>
                  <td>
                    {u.disabledAt ? (
                      <span className={`${ui.badge} ${ui.badgeDisabled}`}>deactivated</span>
                    ) : u.passwordHash ? (
                      <span className={`${ui.badge} ${ui.badgePublished}`}>active</span>
                    ) : (
                      <span className={ui.badge}>{u.lastLoginAt ? "no password" : "invited"}</span>
                    )}
                  </td>
                  <td className={`${ui.muted} ${ui.nowrap}`}>{u.lastLoginAt ? formatDate(u.lastLoginAt.toISOString()) : "Never"}</td>
                  <td>
                    <UserControls
                      userId={u.id}
                      role={u.role}
                      disabled={Boolean(u.disabledAt)}
                      neverSignedIn={!u.lastLoginAt}
                      hasPassword={Boolean(u.passwordHash)}
                      isSelf={u.id === me.id}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
