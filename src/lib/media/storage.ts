import "server-only";

import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import sharp, { type Metadata } from "sharp";

/**
 * Image storage: Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production), otherwise the local
 * `.data/uploads` folder served by /uploads/[...path] (development).
 */

export const LOCAL_UPLOAD_DIR = path.join(process.cwd(), ".data", "uploads");
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel functions accept ~4.5 MB request bodies
const MAX_DIMENSION = 2400;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "heif"]);

export class UploadError extends Error {}

export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function slugifyFilename(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "image"
  );
}

/** Validate by content (not the browser-reported type), auto-rotate, cap the size and convert to WebP. */
export async function processImage(input: Buffer) {
  let meta: Metadata;
  try {
    meta = await sharp(input, { animated: true }).metadata();
  } catch {
    throw new UploadError("That file isn’t a supported image.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new UploadError("Upload a JPEG, PNG, WebP, GIF or AVIF image. (SVG isn’t allowed.)");
  }

  const animated = (meta.pages ?? 1) > 1;
  const { data, info } = await sharp(input, { animated })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    width: info.width,
    // Animated images report the full strip height; use one frame.
    height: animated && info.pageHeight ? info.pageHeight : info.height,
    mimeType: "image/webp",
  };
}

export async function storeImage(buffer: Buffer, originalName: string) {
  const key = `blog/${new Date().toISOString().slice(0, 7)}/${slugifyFilename(originalName)}-${randomUUID().slice(0, 8)}.webp`;

  if (blobConfigured()) {
    const blob = await put(key, buffer, { access: "public", contentType: "image/webp", cacheControlMaxAge: 60 * 60 * 24 * 365 });
    return { url: blob.url, pathname: blob.pathname };
  }
  if (process.env.VERCEL) {
    throw new UploadError("Media storage isn’t configured. Add a Vercel Blob store (BLOB_READ_WRITE_TOKEN).");
  }

  const file = path.join(LOCAL_UPLOAD_DIR, key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, buffer);
  return { url: `/uploads/${key}`, pathname: key };
}

export async function removeImage(stored: { url: string; pathname: string }) {
  if (/^https:\/\//.test(stored.url)) {
    if (blobConfigured()) await del(stored.url);
    return;
  }
  const file = path.join(LOCAL_UPLOAD_DIR, stored.pathname);
  if (!file.startsWith(LOCAL_UPLOAD_DIR + path.sep)) return;
  await fs.rm(file, { force: true });
}
