import "server-only";

import sanitizeHtml from "sanitize-html";

/**
 * Allowlist for article HTML coming from the admin editor. Anything not listed is stripped,
 * so a compromised or careless account can't inject scripts, styles or tracking into the blog.
 */

const YOUTUBE_EMBED = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\/[\w-]+/;

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr",
    "strong", "b", "em", "i", "u", "s", "code", "pre", "mark", "sub", "sup",
    "a", "blockquote", "ul", "ol", "li",
    "img", "figure", "figcaption", "iframe", "div",
    "table", "thead", "tbody", "tr", "th", "td", "colgroup", "col",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    iframe: ["src", "width", "height", "allowfullscreen", "title"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    ol: ["start"],
    div: ["data-youtube-video"],
    pre: ["class"],
    code: ["class"],
  },
  allowedClasses: { code: [/^language-[\w-]+$/], pre: [/^language-[\w-]+$/] },
  allowedSchemes: ["https", "http", "mailto"],
  allowedSchemesByTag: { img: ["https", "http", "data"] },
  allowProtocolRelative: false,
  // Articles start at h2 (the title is the page's only h1).
  transformTags: { h1: "h2", h5: "h4", h6: "h4" },
  exclusiveFilter: (frame) => frame.tag === "iframe" && !YOUTUBE_EMBED.test(frame.attribs.src ?? ""),
};

export function sanitizePostHtml(html: string) {
  return sanitizeHtml(html, options).trim();
}

/** True when the HTML has no visible text or media. */
export function isEmptyHtml(html: string) {
  return !/<(img|iframe)\b/i.test(html) && sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} }).trim() === "";
}
