import fs from "node:fs/promises";
import path from "node:path";
import { blobConfigured, LOCAL_UPLOAD_DIR } from "@/lib/media/storage";

/** Serves locally stored uploads during development. In production media lives on Vercel Blob. */
export async function GET(_request: Request, { params }: RouteContext<"/uploads/[...path]">) {
  if (blobConfigured()) return new Response("Not found", { status: 404 });
  const segments = (await params).path;
  const file = path.join(LOCAL_UPLOAD_DIR, ...segments);
  if (!file.startsWith(LOCAL_UPLOAD_DIR + path.sep) || !file.endsWith(".webp")) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const data = await fs.readFile(file);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
