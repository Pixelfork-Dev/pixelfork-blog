import type { Element, Root } from "hast";
import { toString } from "hast-util-to-string";
import rehypeExternalLinks from "rehype-external-links";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";
import { visit } from "unist-util-visit";
import type { TocItem } from "./types";

/** Collects h2/h3 headings (after rehype-slug assigned ids) into a table of contents. */
function rehypeToc(toc: TocItem[]) {
  return () => (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if ((node.tagName === "h2" || node.tagName === "h3") && node.properties?.id) {
        toc.push({
          id: String(node.properties.id),
          text: toString(node),
          depth: node.tagName === "h2" ? 2 : 3,
        });
      }
    });
  };
}

/** Lazy-load in-article images; the cover image is the LCP element, not these. */
function rehypeLazyImages() {
  return (tree: Root) => {
    visit(tree, "element", (node: Element) => {
      if (node.tagName === "img") {
        node.properties = { ...node.properties, loading: "lazy", decoding: "async" };
      }
    });
  };
}

export async function renderMarkdown(markdown: string) {
  const toc: TocItem[] = [];
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeToc(toc))
    .use(rehypeLazyImages)
    .use(rehypeExternalLinks, { target: "_blank", rel: ["noopener", "noreferrer"] })
    .use(rehypeStringify)
    .process(markdown);

  return { html: String(file), toc };
}

export function countWords(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\[\]()!-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}
