/**
 * Type C covers: bold, code-built graphics for lists, comparisons and technical topics. No AI; the
 * headline is real text, so it's always spelled right. Renders a 1600×900 SVG.
 */
import { esc, wrap } from "./graphics.mts";

const W = 1600;
const H = 900;
const FONT = "Helvetica Neue, Helvetica, Arial, sans-serif";
const ORANGE = "#F26207";

export type GraphicTemplate = "gauge" | "network" | "document" | "bars";

export interface GraphicCover {
  template: GraphicTemplate;
  kicker: string;
  headline: string;
  /** Two gradient colors for the background. */
  colors: [string, string];
}

function background([a, b]: [string, string]) {
  let dots = "";
  for (let x = 40; x < W; x += 40) for (let y = 40; y < H; y += 40) dots += `<circle cx="${x}" cy="${y}" r="1.6" fill="#fff" opacity="0.12"/>`;
  return `<defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>
    <radialGradient id="glow" cx="0.75" cy="0.35" r="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#000" flood-opacity="0.28"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>${dots}<rect width="${W}" height="${H}" fill="url(#glow)"/>`;
}

function headline(kicker: string, text: string) {
  const lines = wrap(text, 16).slice(0, 3);
  const size = 86;
  const top = H - 110 - (lines.length - 1) * (size + 6);
  return `<rect x="96" y="${top - size - 70}" width="${kicker.length * 17 + 48}" height="48" rx="24" fill="#141629"/>
    <text x="${120}" y="${top - size - 37}" font-family="${FONT}" font-size="22" font-weight="700" letter-spacing="3" fill="${ORANGE}">${esc(kicker.toUpperCase())}</text>
    ${lines.map((l, i) => `<text x="96" y="${top + i * (size + 6)}" font-family="${FONT}" font-size="${size}" font-weight="800" letter-spacing="-2" fill="#fff">${esc(l)}</text>`).join("")}`;
}

/** Performance: a phone with a speed gauge. */
function gauge() {
  const cx = 1180, cy = 330;
  let ticks = "";
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI * (1 - i / 10);
    const r1 = 250, r2 = i % 5 ? 228 : 210;
    ticks += `<line x1="${cx + r1 * Math.cos(a)}" y1="${cy - r1 * Math.sin(a)}" x2="${cx + r2 * Math.cos(a)}" y2="${cy - r2 * Math.sin(a)}" stroke="#fff" stroke-width="${i % 5 ? 4 : 8}" stroke-linecap="round" opacity="0.85"/>`;
  }
  const needle = Math.PI * (1 - 0.82);
  return `<g filter="url(#shadow)">
    <rect x="1010" y="380" width="340" height="600" rx="56" fill="#141629"/>
    <rect x="1032" y="410" width="296" height="560" rx="40" fill="#1f2344"/>
  </g>
  <path d="M ${cx - 270} ${cy} A 270 270 0 0 1 ${cx + 270} ${cy}" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="34" stroke-linecap="round"/>
  <path d="M ${cx - 270} ${cy} A 270 270 0 0 1 ${cx + 270 * Math.cos(needle)} ${cy - 270 * Math.sin(needle)}" fill="none" stroke="${ORANGE}" stroke-width="34" stroke-linecap="round"/>
  ${ticks}
  <line x1="${cx}" y1="${cy}" x2="${cx + 200 * Math.cos(needle)}" y2="${cy - 200 * Math.sin(needle)}" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
  <circle cx="${cx}" cy="${cy}" r="26" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="11" fill="${ORANGE}"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="${1070}" y="${520 + i * 52 + 40}" width="${[220, 170, 250, 130][i]}" height="22" rx="11" fill="${i === 2 ? "#7ef0c5" : "#fff"}" opacity="${i === 2 ? 1 : 0.35}"/>`).join("")}`;
}

/** Mediation / networks: several nodes feeding a central auction hub. */
function network() {
  const hub = { x: 1150, y: 420 };
  const nodes = [
    { x: 870, y: 190, c: "#7ef0c5" },
    { x: 1450, y: 200, c: "#ffd166" },
    { x: 1480, y: 600, c: "#8ecbff" },
    { x: 860, y: 640, c: "#ff8fb1" },
    { x: 1160, y: 110, c: "#c3a6ff" },
  ];
  return `${nodes.map((n) => `<line x1="${n.x}" y1="${n.y}" x2="${hub.x}" y2="${hub.y}" stroke="#fff" stroke-width="6" stroke-dasharray="4 18" stroke-linecap="round" opacity="0.7"/>`).join("")}
  ${nodes.map((n) => `<g filter="url(#shadow)"><circle cx="${n.x}" cy="${n.y}" r="62" fill="${n.c}"/><rect x="${n.x - 26}" y="${n.y - 20}" width="52" height="40" rx="8" fill="#141629" opacity="0.85"/><polygon points="${n.x - 8},${n.y - 10} ${n.x + 12},${n.y} ${n.x - 8},${n.y + 10}" fill="${n.c}"/></g>`).join("")}
  <g filter="url(#shadow)">
    <circle cx="${hub.x}" cy="${hub.y}" r="150" fill="#141629"/>
    <circle cx="${hub.x}" cy="${hub.y}" r="118" fill="${ORANGE}"/>
    <rect x="${hub.x - 60}" y="${hub.y - 46}" width="120" height="92" rx="14" fill="#fff"/>
    <polygon points="${hub.x - 18},${hub.y - 26} ${hub.x + 30},${hub.y} ${hub.x - 18},${hub.y + 26}" fill="${ORANGE}"/>
  </g>
  <path d="M ${hub.x + 150} ${hub.y + 150} l 40 40" stroke="#fff" stroke-width="18" stroke-linecap="round"/>
  <rect x="${hub.x + 170}" y="${hub.y + 110}" width="90" height="46" rx="10" transform="rotate(45 ${hub.x + 215} ${hub.y + 133})" fill="#fff"/>`;
}

/** Documents / templates: stacked pages with section blocks. */
function documentStack() {
  const page = (x: number, y: number, rot: number, fill: string, detail: boolean) => `<g transform="rotate(${rot} ${x + 210} ${y + 280})" filter="url(#shadow)">
    <rect x="${x}" y="${y}" width="420" height="560" rx="22" fill="${fill}"/>
    ${
      detail
        ? `<rect x="${x + 40}" y="${y + 48}" width="220" height="30" rx="8" fill="#141629"/>
      <rect x="${x + 40}" y="${y + 100}" width="340" height="14" rx="7" fill="#141629" opacity="0.25"/>
      <rect x="${x + 40}" y="${y + 126}" width="290" height="14" rx="7" fill="#141629" opacity="0.25"/>
      <rect x="${x + 40}" y="${y + 172}" width="160" height="120" rx="14" fill="${ORANGE}"/>
      <rect x="${x + 220}" y="${y + 172}" width="160" height="120" rx="14" fill="#7ef0c5"/>
      <rect x="${x + 40}" y="${y + 312}" width="340" height="14" rx="7" fill="#141629" opacity="0.25"/>
      <rect x="${x + 40}" y="${y + 338}" width="250" height="14" rx="7" fill="#141629" opacity="0.25"/>
      ${[0, 1, 2].map((i) => `<rect x="${x + 40}" y="${y + 384 + i * 44}" width="28" height="28" rx="7" fill="${i < 2 ? ORANGE : "none"}" stroke="${ORANGE}" stroke-width="4"/><rect x="${x + 88}" y="${y + 392 + i * 44}" width="${[240, 200, 260][i]}" height="12" rx="6" fill="#141629" opacity="0.3"/>`).join("")}`
        : ""
    }
  </g>`;
  return `${page(930, 190, -9, "#ffd166", false)}${page(1010, 170, 5, "#8ecbff", false)}${page(960, 150, -2, "#ffffff", true)}
  <g transform="rotate(-28 1440 250)" filter="url(#shadow)"><rect x="1400" y="120" width="42" height="300" rx="10" fill="${ORANGE}"/><polygon points="1400,420 1442,420 1421,470" fill="#ffd166"/></g>`;
}

/** Comparisons / rankings: rising bars. */
function bars() {
  const colors = ["#8ecbff", "#7ef0c5", "#ffd166", ORANGE];
  const heights = [220, 330, 440, 580];
  return heights
    .map((h, i) => `<g filter="url(#shadow)"><rect x="${900 + i * 160}" y="${780 - h}" width="120" height="${h}" rx="18" fill="${colors[i]}"/></g>`)
    .join("") + `<polyline points="960,520 1120,430 1280,300 1440,150" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><circle cx="1440" cy="150" r="22" fill="#fff"/>`;
}

export function graphicCoverSvg(cover: GraphicCover) {
  const art = { gauge, network, document: documentStack, bars }[cover.template]();
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${background(cover.colors)}${art}${headline(cover.kicker, cover.headline)}</svg>`;
}
