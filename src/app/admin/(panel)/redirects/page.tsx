import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth/dal";
import { RedirectManager } from "./RedirectManager";
import ui from "../../admin.module.css";

export const metadata: Metadata = { title: "Redirects" };

export default async function RedirectsPage() {
  await requireUser();
  const rows = await db.select().from(schema.redirects).orderBy(desc(schema.redirects.createdAt));

  return (
    <>
      <header className={ui.pageHeader}>
        <div>
          <h1 className={ui.title}>Redirects</h1>
          <p className={ui.subtitle}>Permanent (308) redirects keep old links and search rankings working when URLs change.</p>
        </div>
      </header>
      <RedirectManager
        rows={rows.map((r) => ({
          id: r.id,
          fromPath: r.fromPath,
          toPath: r.toPath,
          source: r.source,
          hits: r.hits,
          lastHitAt: r.lastHitAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
