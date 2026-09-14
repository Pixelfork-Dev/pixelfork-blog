"use server";

import { desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { assertRole, AuthorizationError, hasRole } from "@/lib/auth/dal";
import { removeImage } from "@/lib/media/storage";

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  size: number;
  width: number;
  height: number;
  alt: string;
  createdAt: string;
}

function toItem(row: typeof schema.media.$inferSelect): MediaItem {
  return {
    id: row.id,
    url: row.url,
    filename: row.filename,
    size: row.size,
    width: row.width,
    height: row.height,
    alt: row.alt,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listMedia(query = ""): Promise<MediaItem[]> {
  await assertRole("contributor");
  const q = query.trim().slice(0, 100);
  const rows = await db
    .select()
    .from(schema.media)
    .where(q ? or(ilike(schema.media.filename, `%${q}%`), ilike(schema.media.alt, `%${q}%`)) : undefined)
    .orderBy(desc(schema.media.createdAt))
    .limit(300);
  return rows.map(toItem);
}

export async function updateMediaAlt(id: string, alt: string): Promise<{ ok: boolean; message: string }> {
  try {
    const user = await assertRole("contributor");
    const clean = z.string().trim().max(300, "Keep alt text under 300 characters.").safeParse(alt);
    if (!clean.success) return { ok: false, message: clean.error.issues[0].message };
    const row = await db.query.media.findFirst({ columns: { uploadedById: true }, where: eq(schema.media.id, z.uuid().parse(id)) });
    if (!row) return { ok: false, message: "This image no longer exists." };
    if (!hasRole(user, "editor") && row.uploadedById !== user.id) return { ok: false, message: "You can only edit images you uploaded." };
    await db.update(schema.media).set({ alt: clean.data }).where(eq(schema.media.id, z.uuid().parse(id)));
    return { ok: true, message: "Alt text saved." };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Couldn’t save the alt text." };
  }
}

/** Delete an image unless a post still uses it (as the cover or inside the article). */
export async function deleteMedia(id: string): Promise<{ ok: boolean; message: string }> {
  try {
    await assertRole("editor"); // contributors can't delete media
    const row = await db.query.media.findFirst({ where: eq(schema.media.id, z.uuid().parse(id)) });
    if (!row) return { ok: false, message: "This image no longer exists." };

    const usedIn = await db
      .select({ title: schema.posts.title })
      .from(schema.posts)
      .where(or(eq(schema.posts.coverSrc, row.url), ilike(schema.posts.content, `%${row.url}%`)))
      .limit(5);
    if (usedIn.length) {
      return { ok: false, message: `Still used in: ${usedIn.map((p) => `“${p.title}”`).join(", ")}. Replace it there first.` };
    }

    await removeImage(row);
    await db.delete(schema.media).where(eq(schema.media.id, row.id));
    return { ok: true, message: "Image deleted." };
  } catch (e) {
    if (e instanceof AuthorizationError) return { ok: false, message: e.message };
    console.error(e);
    return { ok: false, message: "Couldn’t delete the image." };
  }
}
