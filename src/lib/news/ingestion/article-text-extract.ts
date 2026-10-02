/**
 * Source-text enrichment, layer B: main-text extraction from a publisher article page.
 *
 * Used ONLY for sources whose feed carries excerpts (registry `fullText: "page"`, e.g. Lalluram), only for URLs the
 * publisher's robots.txt allows (see robots.ts), and only for Chhattisgarh-relevant items. The extracted text is source
 * material for the normal gates and the editorial rewrite -- never published verbatim -- and the signal keeps its
 * attribution (publisher, URL, method, fetch time) in ingestion_metadata.text_enrichment.
 *
 * Pure: HTML in, text out. Order of preference:
 *   1. schema.org JSON-LD `articleBody` (what the publisher itself declares as the article)
 *   2. the densest article container (<article>, itemprop=articleBody, known CMS content classes), paragraphs only
 * Navigation, headers/footers, sidebars, share bars, related-story widgets, comments and ads are removed first.
 */

import { cleanArticleText, MAX_SOURCE_TEXT_CHARS } from "@/lib/news/ingestion/feed-fulltext";

/** Below this the page is not treated as having extractable article text. */
export const MIN_EXTRACTED_CHARS = 300;

const NOISE_BLOCKS =
  /<(script|style|noscript|nav|header|footer|aside|form|iframe|button|svg|figure|figcaption|select|template)\b[\s\S]*?<\/\1>/gi;
const NOISE_CLASS =
  /<(div|section|ul|ol|p|span)\b[^>]*\b(?:class|id)=["'][^"']*\b(?:share|social|related|recommend|comment|advert|promo|sidebar|widget|newsletter|breadcrumb|tags?|author-box|more-stories|read-?more|also-?read|trending|taboola|outbrain)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi;

const CONTENT_CONTAINER_HINT =
  /(?:itemprop=["']articleBody["']|class=["'][^"']*\b(?:entry-content|article-body|article__body|post-content|story-content|story-body|td-post-content|single-content|news-content|article-content|content-body|detail-content|main-content)\b[^"']*["'])/i;

type Extracted = { text: string; method: "jsonld_articleBody" | "article_container" } | null;

function findJsonLdArticleBody(html: string): string | null {
  const blocks = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
  for (const block of blocks) {
    const json = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "").trim();
    try {
      const parsed: unknown = JSON.parse(json);
      const queue: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (queue.length) {
        const node = queue.shift();
        if (!node || typeof node !== "object") continue;
        const obj = node as Record<string, unknown>;
        if (Array.isArray(obj["@graph"])) queue.push(...(obj["@graph"] as unknown[]));
        const type = obj["@type"];
        const isArticle = (Array.isArray(type) ? type : [type]).some((t) => typeof t === "string" && /article|newsarticle|reportage|blogposting/i.test(t));
        if (isArticle && typeof obj.articleBody === "string" && obj.articleBody.trim().length > 0) return obj.articleBody;
      }
    } catch {
      /* malformed JSON-LD is common; try the next block */
    }
  }
  return null;
}

/** Returns the inner HTML of the first balanced <tag ...> starting at `start` (index of '<'). */
function balancedInner(html: string, start: number, tag: string): string {
  const open = new RegExp(`<${tag}\\b`, "gi");
  const close = new RegExp(`</${tag}>`, "gi");
  const gt = html.indexOf(">", start);
  let depth = 1;
  let pos = gt + 1;
  while (depth > 0) {
    open.lastIndex = pos;
    close.lastIndex = pos;
    const o = open.exec(html);
    const c = close.exec(html);
    if (!c) return html.slice(gt + 1);
    if (o && o.index < c.index) {
      depth++;
      pos = o.index + 1;
    } else {
      depth--;
      if (depth === 0) return html.slice(gt + 1, c.index);
      pos = c.index + 1;
    }
  }
  return html.slice(gt + 1);
}

function paragraphsOf(containerHtml: string): string {
  const cleaned = containerHtml.replace(NOISE_BLOCKS, " ").replace(NOISE_CLASS, " ");
  const paras = cleaned.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? [];
  return cleanArticleText(paras.join("\n"));
}

function bestContainerText(html: string): string {
  const candidates: string[] = [];
  const re = /<(article|div|section|main)\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  let guard = 0;
  while ((m = re.exec(html)) && guard++ < 400) {
    const tag = m[1]!.toLowerCase();
    const isHinted = CONTENT_CONTAINER_HINT.test(m[0]);
    if (tag !== "article" && !isHinted) continue;
    const text = paragraphsOf(balancedInner(html, m.index, tag));
    if (text) candidates.push(text);
  }
  return candidates.sort((a, b) => b.length - a.length)[0] ?? "";
}

export function extractArticleText(html: string): Extracted {
  if (!html) return null;
  const ld = findJsonLdArticleBody(html);
  if (ld) {
    const text = cleanArticleText(ld).slice(0, MAX_SOURCE_TEXT_CHARS).trim();
    if (text.length >= MIN_EXTRACTED_CHARS) return { text, method: "jsonld_articleBody" };
  }
  const text = bestContainerText(html).slice(0, MAX_SOURCE_TEXT_CHARS).trim();
  return text.length >= MIN_EXTRACTED_CHARS ? { text, method: "article_container" } : null;
}
