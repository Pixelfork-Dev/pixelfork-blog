/**
 * Editor SEO checklist. Pure and client-side: runs on every keystroke against the current draft.
 * The checks follow Google's guidance (helpful content, descriptive titles/snippets, alt text, links).
 */

export interface SeoCheck {
  id: string;
  label: string;
  status: "good" | "warn" | "bad";
  tip?: string;
}

interface Draft {
  title: string;
  seoTitle: string;
  slug: string;
  excerpt: string;
  seoDescription: string;
  content: string;
  coverSrc: string;
  coverAlt: string;
  tagIds: string[];
  focusKeyword: string;
  noindex: boolean;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function inspectContent(html: string) {
  const doc = new DOMParser().parseFromString(html || "", "text/html");
  const text = doc.body.textContent ?? "";
  const images = [...doc.querySelectorAll("img")];
  const links = [...doc.querySelectorAll("a[href]")].map((a) => a.getAttribute("href") ?? "");
  const headings = [...doc.querySelectorAll("h2, h3, h4")].map((h) => Number(h.tagName[1]));
  return {
    words: text.split(/\s+/).filter(Boolean).length,
    firstParagraph: doc.querySelector("p")?.textContent ?? "",
    h2Count: headings.filter((h) => h === 2).length,
    skippedLevel: headings.some((h, i) => i > 0 && h - headings[i - 1] > 1) || headings[0] > 2,
    imagesWithoutAlt: images.filter((img) => !(img.getAttribute("alt") ?? "").trim()).length,
    internalLinks: links.filter((href) => href.startsWith("/") || /pixelfork\.ai/.test(href)).length,
    headingText: [...doc.querySelectorAll("h2, h3")].map((h) => h.textContent ?? "").join(" "),
  };
}

export function runSeoChecks(d: Draft): SeoCheck[] {
  const c = inspectContent(d.content);
  const title = d.seoTitle || d.title;
  const description = d.seoDescription || d.excerpt;
  const checks: SeoCheck[] = [];
  const add = (id: string, label: string, status: SeoCheck["status"], tip?: string) => checks.push({ id, label, status, tip });

  if (d.noindex) add("noindex", "Hidden from search engines", "warn", "This post won’t appear in Google. Turn off “Hide from search” to change that.");

  // Title
  if (title.length === 0) add("title", "Title", "bad", "Add a title.");
  else if (title.length < 30) add("title", `Title is short (${title.length} characters)`, "warn", "Aim for 30–60 characters so it’s descriptive in search results.");
  else if (title.length > 60) add("title", `Title may be cut off (${title.length} characters)`, "warn", "Google shows about 60 characters. Use an SEO title to shorten it.");
  else add("title", "Title length", "good");

  // Description
  if (description.length === 0) add("description", "Meta description", "bad", "Write an excerpt — it’s used as the search snippet.");
  else if (description.length < 120) add("description", `Description is short (${description.length})`, "warn", "Aim for 120–160 characters that summarize the post.");
  else if (description.length > 160) add("description", `Description may be cut off (${description.length})`, "warn", "Keep it under ~160 characters.");
  else add("description", "Description length", "good");

  // URL
  if (d.slug.length > 75 || d.slug.split("-").length > 10) add("slug", "URL is long", "warn", "Short, readable URLs are easier to share and understand.");
  else if (d.slug) add("slug", "URL is short and readable", "good");

  // Content
  if (c.words < 300) add("length", `${c.words} words`, c.words < 150 ? "bad" : "warn", "Thin posts rarely rank. Cover the topic in depth (usually 600+ words).");
  else add("length", `${c.words} words`, "good");

  if (c.h2Count === 0) add("headings", "No section headings", "warn", "Break the post into sections with H2 headings.");
  else if (c.skippedLevel) add("headings", "Heading levels skip", "warn", "Go H2 → H3 → H4 without skipping levels.");
  else add("headings", `${c.h2Count} section heading${c.h2Count === 1 ? "" : "s"}`, "good");

  // Media
  if (!d.coverSrc) add("cover", "No cover image", "warn", "A cover image improves clicks from search, social and Discover.");
  else if (!d.coverAlt) add("cover", "Cover image has no alt text", "bad", "Describe the cover image.");
  else add("cover", "Cover image with alt text", "good");

  if (c.imagesWithoutAlt > 0) add("alt", `${c.imagesWithoutAlt} image${c.imagesWithoutAlt === 1 ? "" : "s"} without alt text`, "bad", "Describe every image for accessibility and image search.");

  // Links & taxonomy
  if (c.internalLinks === 0) add("links", "No internal links", "warn", "Link to related Pixelfork articles or pages to help readers and crawlers.");
  else add("links", `${c.internalLinks} internal link${c.internalLinks === 1 ? "" : "s"}`, "good");

  if (d.tagIds.length === 0) add("tags", "No tags", "warn", "Add at least one tag so the post appears in a section.");

  // Focus keyword
  const kw = norm(d.focusKeyword);
  if (!kw) {
    add("keyword", "No focus keyword", "warn", "Set the phrase people would search for to get keyword tips.");
  } else {
    const has = (s: string) => norm(s).includes(kw);
    add("kw-title", "Keyword in title", has(title) ? "good" : "warn", has(title) ? undefined : "Use the keyword naturally in the title.");
    add("kw-desc", "Keyword in description", has(description) ? "good" : "warn", has(description) ? undefined : "Mention it in the excerpt or meta description.");
    add("kw-slug", "Keyword in URL", norm(d.slug.replace(/-/g, " ")).includes(kw) ? "good" : "warn");
    add("kw-intro", "Keyword in the first paragraph", has(c.firstParagraph) ? "good" : "warn", has(c.firstParagraph) ? undefined : "Introduce the topic early.");
    add("kw-headings", "Keyword in a heading", has(c.headingText) ? "good" : "warn");
  }

  return checks;
}

export function seoScore(checks: SeoCheck[]) {
  const bad = checks.filter((c) => c.status === "bad").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  if (bad > 0) return { label: "Needs work", tone: "bad" as const };
  if (warn > 2) return { label: "Could be better", tone: "warn" as const };
  return { label: "Good", tone: "good" as const };
}
