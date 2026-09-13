"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db, schema } from "@/db";
import { recordMove } from "@/lib/admin/redirects";
import { revalidatePublicSite } from "@/lib/admin/revalidate";
import { assertRole, AuthorizationError } from "@/lib/auth/dal";
import { normalizePath } from "@/lib/redirects";

export interface RedirectResult {
  ok: boolean;
  message: string;
  fieldErrors?: { from?: string; to?: string };
}

const RESERVED = /^\/(admin|api|_next|uploads)(\/|$)|^\/(sitemap\.xml|robots\.txt|feed\.xml|manifest\.webmanifest)$/;

export async function createRedirect(input: { from: string; to: string }): Promise<RedirectResult> {
  try {
    await assertRole("editor");
    const rawFrom = input.from.trim();
    const rawTo = input.to.trim();
    const fieldErrors: RedirectResult["fieldErrors"] = {};

    let from = "";
    try {
      const parsed = rawFrom.startsWith("http") ? new URL(rawFrom).pathname : rawFrom;
      from = normalizePath(parsed);
    } catch {
      fieldErrors.from = "Enter a path like /old-article.";
    }
    if (from === "/" || !from) fieldErrors.from = "Enter the old path, like /old-article.";
    else if (RESERVED.test(from)) fieldErrors.from = "This path is reserved and can’t be redirected.";

    const isAbsolute = /^https?:\/\//.test(rawTo);
    if (!rawTo) fieldErrors.to = "Enter where it should go.";
    else if (isAbsolute && !z.url({ protocol: /^https$/ }).safeParse(rawTo).success) fieldErrors.to = "Use an https:// URL or a site path.";
    else if (!isAbsolute && !rawTo.startsWith("/")) fieldErrors.to = "Site paths start with /.";

    const to = isAbsolute ? rawTo : normalizePath(rawTo);
    if (!fieldErrors.from && !fieldErrors.to && to === from) fieldErrors.to = "A redirect can’t point to itself.";

    if (fieldErrors.from || fieldErrors.to) return { ok: false, message: "Please fix the highlighted fields.", fieldErrors };

    if (isAbsolute) {
      await db
        .insert(schema.redirects)
        .values({ fromPath: from, toPath: to, source: "manual" })
        .onConflictDoUpdate({ target: schema.redirects.fromPath, set: { toPath: to, source: "manual" } });
    } else {
      await recordMove(from, to);
      await db.update(schema.redirects).set({ source: "manual" }).where(eq(schema.redirects.fromPath, from));
    }

    revalidatePublicSite();
    revalidatePath("/admin/redirects");
    return { ok: true, message: `${from} now redirects to ${to}.` };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

export async function deleteRedirect(id: string): Promise<RedirectResult> {
  try {
    await assertRole("editor");
    const [row] = await db.delete(schema.redirects).where(eq(schema.redirects.id, z.uuid().parse(id))).returning({ from: schema.redirects.fromPath });
    revalidatePublicSite();
    revalidatePath("/admin/redirects");
    return row ? { ok: true, message: `Redirect from ${row.from} removed.` } : { ok: false, message: "This redirect no longer exists." };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}
