import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

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
