import type { Metadata } from "next";
import { desc, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { API_SCOPES, DAILY_LIMITS } from "@/lib/api/tokens";
import { requireAdminPage } from "@/lib/auth/dal";
import { formatDate } from "@/lib/format";
import { RevokeButton } from "./RevokeButton";
import { TokenForm } from "./TokenForm";
import ui from "../../admin.module.css";

export const metadata: Metadata = { title: "API tokens" };

export default async function ApiTokensPage() {
  await requireAdminPage();
  const tokens = await db
    .select()
    .from(schema.apiTokens)
    .orderBy(sql`${schema.apiTokens.revokedAt} is not null`, desc(schema.apiTokens.createdAt));

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>API tokens</h1>
          <p className={ui.subtitle}>
            For automation, like the scheduled article writer. Tokens can only create drafts (up to {DAILY_LIMITS.posts} posts and {DAILY_LIMITS.media} images a day)
            and, if allowed, replace covers. They can never publish, delete or read users.
          </p>
        </div>
      </header>

      <section className={ui.section} aria-labelledby="new-token">
        <h2 id="new-token" className={ui.sectionTitle}>
          Create a token
        </h2>
        <TokenForm scopes={Object.entries(API_SCOPES)} />
      </section>

      <section className={ui.section} aria-labelledby="token-list">
        <h2 id="token-list" className={ui.sectionTitle}>
          Tokens ({tokens.length})
        </h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Token</th>
                <th>Permissions</th>
                <th>Last used</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {tokens.length === 0 && (
                <tr>
                  <td colSpan={6} className={ui.muted}>
                    No tokens yet.
                  </td>
                </tr>
              )}
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td className={ui.strong}>{t.name}</td>
                  <td className={ui.muted}>
                    <code>{t.prefix}…</code>
                  </td>
                  <td className={ui.muted}>{t.scopes.join(", ")}</td>
                  <td className={`${ui.muted} ${ui.nowrap}`}>{t.lastUsedAt ? formatDate(t.lastUsedAt.toISOString()) : "Never"}</td>
                  <td>
                    {t.revokedAt ? <span className={`${ui.badge} ${ui.badgeDisabled}`}>revoked</span> : <span className={`${ui.badge} ${ui.badgePublished}`}>active</span>}
                  </td>
                  <td>{!t.revokedAt && <RevokeButton id={t.id} name={t.name} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
