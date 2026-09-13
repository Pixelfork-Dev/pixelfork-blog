/**
 * Sends content to the live blog through the Publishing API (no database, GitHub or storage credentials).
 *
 *   npm run post:send -- <slug>                          create a draft from content/posts/<slug>
 *   npm run post:send -- --cover <slug> <image> "<alt>"  replace the cover of an existing post
 *
 * The API token is read from the macOS Keychain (account "pixelfork-blog", service "PIXELFORK_BLOG_TOKEN")
 * and never printed. BLOG_URL overrides the target (default https://www.pixelfork.ai/blog); BLOG_API_TOKEN
 * can supply a token for local testing only.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { loadPackage, POSTS_DIR, renderPackage, type Media } from "./lib/package.mts";

const BASE = (process.env.BLOG_URL ?? "https://www.pixelfork.ai/blog").replace(/\/$/, "");

function token() {
  if (process.env.BLOG_API_TOKEN) return process.env.BLOG_API_TOKEN;
  try {
    return execFileSync("security", ["find-generic-password", "-a", "pixelfork-blog", "-s", "PIXELFORK_BLOG_TOKEN", "-w"], { encoding: "utf8" }).trim();
  } catch {
    console.error("✗ PIXELFORK_BLOG_TOKEN not found in the Keychain (account pixelfork-blog).");
    process.exit(1);
  }
}
const auth = { Authorization: `Bearer ${token()}` };

async function call(pathname: string, init: RequestInit) {
  const res = await fetch(`${BASE}${pathname}`, { ...init, headers: { ...auth, ...(init.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${pathname} → ${res.status}: ${body.error ?? res.statusText}`);
  return body;
}

async function upload(buffer: Buffer, filename: string, alt: string): Promise<Media> {
  // Send WebP to stay well under the 4 MB request limit; the server re-processes it anyway.
  const webp = await sharp(buffer).webp({ quality: 90 }).toBuffer();
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(webp)], { type: "image/webp" }), filename.replace(/\.\w+$/, ".webp"));
  form.append("alt", alt);
  const media = await call("/api/publish/media", { method: "POST", body: form });
  return { url: media.url, width: media.width, height: media.height, alt };
}

const args = process.argv.slice(2);

if (args[0] === "--cover") {
  const [, slug, file, alt] = args;
  if (!slug || !file || !alt) {
    console.error('Usage: npm run post:send -- --cover <slug> <image> "<alt>"');
    process.exit(1);
  }
  const buffer = await sharp(await fs.readFile(file)).resize(1600, 900, { fit: "cover" }).webp({ quality: 88 }).toBuffer();
  const media = await upload(buffer, `${slug}-cover.webp`, alt);
  await call(`/api/publish/posts/${slug}/cover`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ src: media.url, alt }) });
  console.log(`✓ cover replaced: ${BASE}/posts/${slug}`);
} else {
  const [slug] = args;
  if (!slug) {
    console.error("Usage: npm run post:send -- <slug>");
    process.exit(1);
  }
  const pkg = await loadPackage(slug);
  const existing = await call(`/api/publish/posts/${slug}`, { method: "GET" });
  if (existing.exists) {
    console.error(`✗ "${slug}" already exists on the blog (${existing.status}). Nothing was uploaded.`);
    process.exit(1);
  }
  const { cover, html, placeholders } = await renderPackage(pkg, path.join(POSTS_DIR, slug), upload);
  const result = await call("/api/publish/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      slug,
      title: pkg.title,
      excerpt: pkg.excerpt,
      seoTitle: pkg.seoTitle,
      seoDescription: pkg.seoDescription,
      focusKeyword: pkg.focusKeyword,
      tags: pkg.tags,
      author: pkg.author,
      cover: cover ? { src: cover.url, alt: cover.alt, width: cover.width, height: cover.height } : undefined,
      html,
    }),
  });
  console.log(`✓ draft created: ${BASE}${result.editUrl}${placeholders ? ` · ⚠ ${placeholders} screenshot placeholders` : ""}${cover ? "" : " · ⚠ no cover"}`);
}
