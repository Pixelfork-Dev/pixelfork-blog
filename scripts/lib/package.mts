/**
 * Renders an article package (content/posts/<slug>/post.mts) into final HTML: uploads the cover,
 * rasterized infographics, screenshots and placeholders through the given `upload` function, and
 * swaps image tokens for <img> tags. Used by publish-post (local DB) and send-post (Publishing API).
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { PostPackage } from "../../content/posts/types.ts";
import { markdownToHtml } from "../../src/lib/markdown.ts";
import { esc, placeholderSvg } from "./graphics.mts";

export type Media = { url: string; alt: string; width: number; height: number };
export type Upload = (buffer: Buffer, filename: string, alt: string) => Promise<Media>;

export const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export async function loadPackage(slug: string): Promise<PostPackage> {
  const pkg: PostPackage = (await import(path.join(POSTS_DIR, slug, "post.mts"))).default;
  if (pkg.slug !== slug) throw new Error(`${slug}: package slug "${pkg.slug}" doesn't match its folder`);
  if (!pkg.body === !pkg.bodyHtml) throw new Error(`${slug}: set exactly one of body or bodyHtml`);
  return pkg;
}

const svgToPng = (svg: string) => sharp(Buffer.from(svg)).png().toBuffer();

/** Cover images are normalized to 16:9 at 1600×900. */
export async function coverBuffer(dir: string, file: string) {
  return sharp(await fs.readFile(path.join(dir, file))).resize(1600, 900, { fit: "cover" }).webp({ quality: 88 }).toBuffer();
}

export async function renderPackage(pkg: PostPackage, dir: string, upload: Upload) {
  const slug = pkg.slug;
  // Validate tokens before uploading anything.
  const tokens = [...(pkg.body ?? "").matchAll(/\{\{img:([\w-]+)(?:\|([^}]*))?\}\}/g)];
  const known = new Set([...Object.keys(pkg.graphics ?? {}), ...Object.keys(pkg.screenshots ?? {}), ...Object.keys(pkg.placeholders ?? {})]);
  const unknown = tokens.map((t) => t[1]).filter((k) => !known.has(k));
  if (unknown.length) throw new Error(`${slug}: unknown image keys ${unknown.join(", ")}`);

  let cover: Media | null = null;
  try {
    cover = await upload(await coverBuffer(dir, pkg.cover.file), `${slug}-cover.webp`, pkg.cover.alt);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    console.warn(`  ! ${slug}: cover file missing (${pkg.cover.file}), continuing without a cover`);
  }

  const images = new Map<string, { media: Media; placeholder: boolean }>();
  for (const key of new Set(tokens.map((t) => t[1]))) {
    if (pkg.graphics?.[key]) {
      const g = pkg.graphics[key];
      images.set(key, { media: await upload(await svgToPng(g.svg), `${slug}-${key}.png`, g.alt), placeholder: false });
    } else if (pkg.screenshots?.[key]) {
      const s = pkg.screenshots[key];
      images.set(key, { media: await upload(await fs.readFile(path.join(dir, s.file)), `${slug}-${key}.png`, s.alt), placeholder: false });
    } else {
      const p = pkg.placeholders![key];
      images.set(key, { media: await upload(await svgToPng(placeholderSvg(p.what, p.how)), `${slug}-${key}.png`, `Placeholder: ${p.what}`), placeholder: true });
    }
  }

  let html = pkg.body ? await markdownToHtml(pkg.body) : pkg.bodyHtml!;
  for (const file of new Set([...html.matchAll(/\{\{file:([^}]+)\}\}/g)].map((m) => m[1]))) {
    const media = await upload(await fs.readFile(path.join(dir, file)), `${slug}-${path.basename(file)}`, "");
    html = html.replaceAll(`{{file:${file}}}`, media.url);
  }
  html = html.replace(/<p>\{\{img:([\w-]+)(?:\|([^}]*))?\}\}<\/p>/g, (_, key: string, caption = "") => {
    const { media, placeholder } = images.get(key)!;
    const credit = pkg.screenshots?.[key]?.credit;
    const text = placeholder ? `⚠ Attention required: ${caption}` : [caption, credit].filter(Boolean).join(" ");
    const img = `<img src="${media.url}" alt="${esc(media.alt)}" width="${media.width}" height="${media.height}">`;
    return text ? `${img}<p><em>${text}</em></p>` : img;
  });
  if (/\{\{img:/.test(html)) throw new Error(`${slug}: image token must be on its own line`);

  const placeholders = [...images.values()].filter((i) => i.placeholder).length;
  return { cover, html, placeholders };
}
