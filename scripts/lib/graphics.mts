/**
 * Infographic building blocks for article images. Everything renders to a 1600×900 SVG in the
 * blog's palette (charcoal, dashed frame, Pixelfork orange) and is rasterized by publish-post.
 */

export const W = 1600;
export const H = 900;
export const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
export const MONO = "Menlo, monospace";
export const C = {
  bg: "#1c1c1c",
  card: "#232323",
  line: "#404040",
  text: "#ffffff",
  muted: "#9a9a9a",
  orange: "#F26207",
  teal: "#5aa9b5",
  green: "#7ad17a",
  red: "#ff7a7a",
  yellow: "#f2c94c",
};

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function text(x: number, y: number, s: string, size = 22, color = C.text, weight = "400", anchor = "start", font = FONT) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${font}" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(s)}</text>`;
}

function lines(x: number, y: number, texts: string[], size = 22, color = C.text, gap = 32, weight = "400", anchor = "start") {
  return texts.map((t, i) => text(x, y + i * gap, t, size, color, weight, anchor)).join("");
}

/** Greedy word wrap by an approximate character budget. */
export function wrap(s: string, max: number) {
  const out: string[] = [];
  let line = "";
  for (const word of s.split(/\s+/)) {
    if ((line + " " + word).trim().length > max && line) {
      out.push(line);
      line = word;
    } else line = (line + " " + word).trim();
  }
  if (line) out.push(line);
  return out;
}

export function frame(title: string, subtitle: string, body: string, source = "Pixelfork Blog") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" fill="none" stroke="${C.line}" stroke-width="2" stroke-dasharray="8 8"/>
  ${text(80, 118, title, 46, C.text, "600")}
  ${text(80, 164, subtitle, 24, C.muted)}
  ${body}
  ${text(80, H - 58, source, 18, C.muted)}
  ${text(W - 80, H - 58, "pixelfork.ai", 20, C.orange, "600", "end")}
</svg>`;
}

type Col = { name: string; accent?: string; rows: [string, string][] };

/** Side-by-side cards with labelled rows (comparisons). */
export function columns(cols: Col[], opts: { top?: number; height?: number; wrapAt?: number } = {}) {
  const accents = [C.orange, C.teal, C.green, C.yellow];
  const top = opts.top ?? 210;
  const height = opts.height ?? 580;
  const gap = 32;
  const cw = (W - 160 - gap * (cols.length - 1)) / cols.length;
  const wrapAt = opts.wrapAt ?? Math.floor(cw / 12.5);
  return cols
    .map((col, i) => {
      const accent = col.accent ?? accents[i % accents.length];
      const x = 80 + i * (cw + gap);
      let y = top + 64;
      let out = `<rect x="${x}" y="${top}" width="${cw}" height="${height}" rx="10" fill="${C.card}" stroke="${C.line}" stroke-dasharray="6 6"/>
        <rect x="${x}" y="${top}" width="${cw}" height="6" rx="3" fill="${accent}"/>
        ${text(x + 32, y, col.name, 34, C.text, "600")}`;
      y += 62;
      for (const [label, value] of col.rows) {
        out += text(x + 32, y, label.toUpperCase(), 16, accent, "600");
        const v = wrap(value, wrapAt);
        out += lines(x + 32, y + 32, v, 22, C.text, 29);
        y += 32 + v.length * 29 + 26;
      }
      return out;
    })
    .join("");
}

/** Horizontal step flow with arrows; each step has a title and an optional note. */
export function flow(steps: { title: string; note?: string; accent?: string }[], opts: { top?: number } = {}) {
  const top = opts.top ?? 330;
  const gap = 44;
  const bw = (W - 160 - gap * (steps.length - 1)) / steps.length;
  const chars = Math.floor(bw / 11.5);
  return steps
    .map((s, i) => {
      const x = 80 + i * (bw + gap);
      const accent = s.accent ?? C.orange;
      const note = s.note ? wrap(s.note, chars) : [];
      let out = `<rect x="${x}" y="${top}" width="${bw}" height="300" rx="12" fill="${C.card}" stroke="${C.line}" stroke-dasharray="6 6"/>
        <circle cx="${x + 44}" cy="${top + 52}" r="22" fill="${accent}"/>
        ${text(x + 44, top + 60, String(i + 1), 22, C.bg, "700", "middle")}
        ${lines(x + 24, top + 122, wrap(s.title, Math.floor(bw / 15)), 26, C.text, 32, "600")}
        ${lines(x + 24, top + 200, note, 20, C.muted, 27)}`;
      if (i < steps.length - 1) {
        const ax = x + bw + 8;
        out += `<line x1="${ax}" y1="${top + 150}" x2="${ax + gap - 18}" y2="${top + 150}" stroke="${C.orange}" stroke-width="3"/>
          <polygon points="${ax + gap - 16},${top + 142} ${ax + gap - 4},${top + 150} ${ax + gap - 16},${top + 158}" fill="${C.orange}"/>`;
      }
      return out;
    })
    .join("");
}

/** Grid of cards (2–3 per row) with a heading, optional mono line and a note. */
export function cards(items: { name: string; mono?: string; note: string; accent?: string }[], perRow = 2, opts: { top?: number; rowGap?: number } = {}) {
  const top = opts.top ?? 210;
  const rows = Math.ceil(items.length / perRow);
  const gap = 32;
  const cw = (W - 160 - gap * (perRow - 1)) / perRow;
  const rowGap = opts.rowGap ?? 28;
  const ch = (H - top - 120 - rowGap * (rows - 1)) / rows;
  const chars = Math.floor(cw / 13);
  return items
    .map((it, i) => {
      const x = 80 + (i % perRow) * (cw + gap);
      const y = top + Math.floor(i / perRow) * (ch + rowGap);
      const accent = it.accent ?? C.orange;
      let yy = y + 56;
      let out = `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="12" fill="${C.card}" stroke="${C.line}" stroke-dasharray="6 6"/>
        ${text(x + 32, yy, it.name, 30, accent, "600")}`;
      if (it.mono) {
        yy += 46;
        out += text(x + 32, yy, it.mono, 22, C.text, "400", "start", MONO);
      }
      out += lines(x + 32, yy + 48, wrap(it.note, chars), 24, it.mono ? C.muted : C.text, 32);
      return out;
    })
    .join("");
}

/** Comparison table: first column labels, then one column per option. */
export function table(headers: string[], rows: string[][], opts: { top?: number; firstWidth?: number; rowHeight?: number; highlight?: number[] } = {}) {
  const top = opts.top ?? 214;
  const firstWidth = opts.firstWidth ?? 360;
  const rh = opts.rowHeight ?? Math.min(76, (H - top - 150) / (rows.length + 1));
  const colW = (W - 160 - firstWidth) / (headers.length - 1);
  const accents = [C.orange, C.teal, C.green, C.yellow];
  let out = `<rect x="80" y="${top}" width="${W - 160}" height="${rh * (rows.length + 1)}" rx="10" fill="${C.card}" stroke="${C.line}" stroke-dasharray="6 6"/>`;
  headers.forEach((h, i) => {
    const x = i === 0 ? 112 : 80 + firstWidth + (i - 1) * colW + 28;
    out += text(x, top + rh / 2 + 10, h, 26, i === 0 ? C.muted : accents[(i - 1) % accents.length], "600");
  });
  rows.forEach((r, ri) => {
    const y = top + rh * (ri + 1);
    out += `<line x1="96" y1="${y}" x2="${W - 96}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`;
    r.forEach((cell, ci) => {
      const x = ci === 0 ? 112 : 80 + firstWidth + (ci - 1) * colW + 28;
      out += text(x, y + rh / 2 + 8, cell, 22, ci === 0 ? C.muted : C.text, ci === 0 ? "600" : "400");
    });
  });
  return out;
}

/** Horizontal bars with a label and a value label; `value` is 0–100. */
export function bars(items: { label: string; value: number; valueLabel: string; accent?: string }[], opts: { top?: number; labelWidth?: number } = {}) {
  const top = opts.top ?? 230;
  const labelWidth = opts.labelWidth ?? 420;
  const rowH = Math.min(96, (H - top - 140) / items.length);
  const maxW = W - 160 - labelWidth - 180;
  return items
    .map((it, i) => {
      const y = top + i * rowH;
      const w = Math.max(8, (maxW * it.value) / 100);
      return `${text(80, y + rowH / 2 + 8, it.label, 24, C.text, "600")}
        <rect x="${80 + labelWidth}" y="${y + rowH / 2 - 18}" width="${maxW}" height="36" rx="6" fill="${C.card}"/>
        <rect x="${80 + labelWidth}" y="${y + rowH / 2 - 18}" width="${w}" height="36" rx="6" fill="${it.accent ?? C.orange}"/>
        ${text(80 + labelWidth + maxW + 24, y + rowH / 2 + 8, it.valueLabel, 22, C.muted)}`;
    })
    .join("");
}

/** A ring of nodes around a center label (loops and cycles). */
export function cycle(center: string, nodes: { title: string; note?: string }[], opts: { cy?: number; r?: number } = {}) {
  const cx = W / 2;
  const cy = opts.cy ?? 520;
  const r = opts.r ?? 250;
  let out = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.orange}" stroke-width="3" stroke-dasharray="10 10"/>
    <circle cx="${cx}" cy="${cy}" r="96" fill="${C.card}" stroke="${C.line}"/>
    ${lines(cx, cy - (wrap(center, 12).length - 1) * 15 + 8, wrap(center, 12), 26, C.text, 30, "600", "middle")}`;
  nodes.forEach((n, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / nodes.length;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    const bw = 300;
    const note = n.note ? wrap(n.note, 26) : [];
    const bh = 64 + note.length * 26;
    out += `<rect x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="12" fill="${C.card}" stroke="${C.orange}" stroke-width="2"/>
      ${text(x, y - bh / 2 + 40, n.title, 24, C.text, "600", "middle")}
      ${lines(x, y - bh / 2 + 70, note, 18, C.muted, 26, "400", "middle")}`;
  });
  return out;
}

export function placeholderSvg(what: string, how: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#181818"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="16" fill="none" stroke="${C.orange}" stroke-width="4" stroke-dasharray="18 12"/>
  ${text(W / 2, 360, "⚠ ATTENTION REQUIRED", 30, C.orange, "700", "middle")}
  ${text(W / 2, 440, "Real screenshot needed", 40, C.text, "600", "middle")}
  ${text(W / 2, 510, what, 28, C.text, "400", "middle")}
  ${text(W / 2, 560, how, 22, C.muted, "400", "middle")}
</svg>`;
}
