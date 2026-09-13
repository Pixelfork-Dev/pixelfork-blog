import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { getCurrentUser } from "@/lib/auth/dal";
import { MAX_UPLOAD_BYTES, processImage, storeImage, UploadError } from "@/lib/media/storage";

/** Upload one image (multipart field "file"). Returns the stored media row. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You are signed out." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Images must be 4 MB or smaller. Export a smaller JPEG or WebP." }, { status: 413 });
  }

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
        alt: String(form.get("alt") ?? "").slice(0, 300),
        uploadedById: user.id,
      })
      .returning();
    return NextResponse.json({ media: row });
  } catch (e) {
    if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
