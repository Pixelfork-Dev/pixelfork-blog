import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import { basePath } from "@/config/site";
import { LOCAL_UPLOAD_DIR } from "@/lib/media/storage";

export const ogSize = { width: 1200, height: 630 };

/** Branded 1200×630 social card in the blog's dashed-grid style. */
export async function renderOgImage({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  const logo = await readFile(path.join(process.cwd(), "public", "logo.svg"), "base64");
  const dash = "#404040";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1c1c1c",
          padding: "64px 80px",
          borderLeft: `2px dashed ${dash}`,
          borderRight: `2px dashed ${dash}`,
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/svg+xml;base64,${logo}`} width={256} height={44} alt="" />
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              padding: "10px 16px",
              border: `2px dashed ${dash}`,
              color: "#838383",
              fontSize: 26,
            }}
          >
            {eyebrow}
          </div>
          <div style={{ fontSize: title.length > 60 ? 56 : 68, lineHeight: 1.1, letterSpacing: -1.5 }}>{title}</div>
        </div>
        <div style={{ display: "flex", color: "#838383", fontSize: 26 }}>{footer}</div>
      </div>
    ),
    ogSize,
  );
}

/** Loads a cover (Blob URL or a file in /public) as a 1200×630 JPEG data URI; null if it can't be read. */
async function coverDataUri(src: string) {
  try {
    let input: Buffer;
    if (/^https?:\/\//.test(src)) {
      const res = await fetch(src);
      if (!res.ok) return null;
      input = Buffer.from(await res.arrayBuffer());
    } else {
      const local = src.startsWith(`${basePath}/`) ? src.slice(basePath.length) : src;
      input = local.startsWith("/uploads/")
        ? await readFile(path.join(LOCAL_UPLOAD_DIR, local.slice("/uploads/".length)))
        : await readFile(path.join(process.cwd(), "public", local));
    }
    const jpeg = await sharp(input).resize(ogSize.width, ogSize.height, { fit: "cover", position: "attention" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Social card for an article: the cover with a soft bottom gradient, tag pill and title. */
export async function renderPostOgImage({ cover, tag, title }: { cover: string | null; tag: string; title: string }) {
  const image = cover ? await coverDataUri(cover) : null;
  if (!image) return renderOgImage({ eyebrow: tag, title, footer: "" });
  const [logo, bold] = await Promise.all([
    readFile(path.join(process.cwd(), "public", "logo.svg"), "base64"),
    readFile(path.join(process.cwd(), "src", "assets", "fonts", "Inter-Bold.otf")),
  ]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: "Inter", color: "#fff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} width={ogSize.width} height={ogSize.height} alt="" style={{ position: "absolute", top: 0, left: 0 }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: ogSize.width,
            height: ogSize.height,
            display: "flex",
            backgroundImage: "linear-gradient(0deg, rgba(13,13,13,0.88) 0%, rgba(13,13,13,0.5) 38%, rgba(13,13,13,0) 70%)",
          }}
        />
        <div style={{ position: "absolute", left: 56, right: 56, bottom: 52, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignSelf: "flex-start", background: "#F26207", borderRadius: 999, padding: "8px 18px", fontSize: 20, fontWeight: 700, letterSpacing: 2 }}>
            {tag.toUpperCase()}
          </div>
          <div style={{ fontSize: title.length > 48 ? 50 : 60, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1 }}>{title}</div>
        </div>
        <div style={{ position: "absolute", top: 40, left: 56, display: "flex", background: "rgba(13,13,13,0.55)", borderRadius: 12, padding: "12px 16px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/svg+xml;base64,${logo}`} width={150} height={26} alt="" />
        </div>
      </div>
    ),
    { ...ogSize, fonts: [{ name: "Inter", data: bold, weight: 700, style: "normal" }] },
  );
}
