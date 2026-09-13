import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { apiRoute, ApiError, assertDailyLimit, authenticate } from "@/lib/api/tokens";
import { MAX_UPLOAD_BYTES, processImage, storeImage, UploadError } from "@/lib/media/storage";

/** Publishing API: upload one image (multipart "file", optional "alt"). Returns { url, width, height }. */
export const POST = apiRoute(async (request: Request) => {
  const token = await authenticate(request, ["drafts:create", "covers:update"]);
  await assertDailyLimit(token.id, "media");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "Send the image as multipart field \"file\".");
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, "Images must be 4 MB or smaller.");

  try {
    const processed = await processImage(Buffer.from(await file.arrayBuffer()));
    const stored = await storeImage(processed.buffer, file.name);
    const [row] = await db
      .insert(schema.media)
      .values({
        url: stored.url,
        pathname: stored.pathname,
        filename: file.name.slice(0, 200),
        mimeType: processed.mimeType,
        size: processed.buffer.length,
        width: processed.width,
        height: processed.height,
        alt: String(form?.get("alt") ?? "").slice(0, 300),
        uploadedById: token.createdById,
        uploadedByTokenId: token.id,
      })
      .returning();
    return NextResponse.json({ url: row.url, width: row.width, height: row.height }, { status: 201 });
  } catch (e) {
    if (e instanceof UploadError) throw new ApiError(400, e.message);
    throw e;
  }
});
