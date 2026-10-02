/**
 * Source-text enrichment, layer A: the publisher's OWN full text that already ships inside its syndication feed.
 *
 * Many local publishers (IBC24, Bhilai Times, Thiha CG, Chhattisgarh Vaibhav, Chhattisgarh 24 News, ...) publish the whole
 * article in <content:encoded> and only a short excerpt in <description>. rss-parser exposes the excerpt as `content` /
 * `contentSnippet` and the article as `content:encoded` / `content:encodedSnippet`; the mapper only ever read the excerpt,
 * so ~130-300 characters per item reached news_signals while 1.5-2.5 KB was being delivered. Measured 2026-10-02:
 * IBC24 CG stored avg 272 chars vs 2,186 in the feed; Bhilai Times 538 vs 1,588.
 *
 * Nothing here fetches anything: it only stops discarding text the publisher chose to syndicate. The text is source
 * material for the normal gates and the editorial rewrite -- it is never published verbatim -- and every item carries
 * attribution metadata (publisher + URL + method) in ingestion_metadata.text_enrichment.
 */

import { decodeHtmlEntities } from "@/lib/news/rss-fetch";

/** Bounds storage, clustering/AI token cost and verbatim exposure; 4,000 chars is far above the evidence gate (~482). */
export const MAX_SOURCE_TEXT_CHARS = 4000;

export type TextEnrichmentMethod = "feed_content_encoded" | "feed_description" | "page_extract";

export type TextEnrichment = {
  method: TextEnrichmentMethod;
  /** Characters of source text attached (after cleaning). */
  chars: number;
  publisher: string | null;
  source_url: string;
  /** Page fetches only: the robots.txt decision that allowed the fetch. */
  robots?: "allowed";
  fetched_at?: string;
};

/** Syndication boilerplate that is not article text. Matched per LINE after tags are stripped. */
const JUNK_LINE_PATTERNS: RegExp[] = [
  /^the post .{0,200} appeared first on .{0,120}\.?$/i,
  /^(read more|continue reading|आगे पढ़ें|और पढ़ें|पूरी खबर पढ़ें|पूरी खबर यहाँ पढ़ें)\b.{0,80}$/i,
  /^(ये भी पढ़ें|यह भी पढ़ें|इसे भी पढ़ें|ये भी देखें|यह भी देखें|also read|read also|related:?|संबंधित)\s*[:：\-–]?.{0,200}$/i,
  /^(follow us|join (our|us)|click here|subscribe|download (the )?app|हमें फॉलो करें|हमारे (व्हाट्सएप|वाट्सएप|टेलीग्राम)).{0,160}$/i,
  /^(whatsapp|telegram|facebook|twitter|instagram|youtube)\b.{0,60}(group|channel|page|चैनल|ग्रुप).{0,80}$/i,
  /^(advertisement|विज्ञापन|sponsored)\s*$/i,
  /^(photo|image|file photo|प्रतीकात्मक (फोटो|तस्वीर)|फाइल फोटो)\s*[:：]?.{0,60}$/i,
  /^https?:\/\/\S+$/i,
];

/** HTML (or already-plain text) -> clean paragraph text. Pure. */
export function cleanArticleText(input: string): string {
  if (!input) return "";
  const html = input
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(figure|figcaption|iframe|aside|nav|form|button|svg|video|audio)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|hr)\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");

  const lines = decodeHtmlEntities(html)
    .replace(/&(nbsp|#160|#xa0);/gi, " ") // also catches double-encoded &amp;nbsp;
    .replace(/ /g, " ")
    .split(/\n+/)
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter((l) => l.length > 0 && !JUNK_LINE_PATTERNS.some((re) => re.test(l)));

  const out: string[] = [];
  for (const line of lines) if (out[out.length - 1] !== line) out.push(line);
  return trimPromoTail(dropTrailingHeadlineList(out).join("\n")).trim();
}

/**
 * Publishers end articles with a call to action ("follow our WhatsApp channel", "read this in English, click here").
 * It is not article text and, in JSON-LD / single-paragraph bodies, it shares a line with the last sentence, so it is
 * cut at its first marker -- but never inside the opening 200 characters (a story that merely mentions WhatsApp).
 */
const PROMO_TAIL_MARKERS =
  /(?:व्हाट्सएप|वाट्सएप|व्हाट्सऐप|टेलीग्राम)\s*(?:चैनल|ग्रुप)|whatsapp\.com\/channel|t\.me\/|फॉलो\s*करना\s*न\s*भूलें|follow\s*करना\s*न\s*भूलें|डॉट\s*कॉम\s*की\s*खबरें|खबरें\s*(?:English|अंग्रेजी)\s*में\s*पढ़ने|subscribe\s+to\s+our|download\s+(?:our|the)\s+app/i;

export function trimPromoTail(text: string): string {
  const m = PROMO_TAIL_MARKERS.exec(text);
  if (!m || m.index < 200) return text;
  // cut back to the end of the previous sentence so no half-sentence of promo prefix remains
  const head = text.slice(0, m.index);
  const lastStop = Math.max(head.lastIndexOf("।"), head.lastIndexOf("."), head.lastIndexOf("!"), head.lastIndexOf("\n"));
  return lastStop >= 200 ? head.slice(0, lastStop + 1) : head;
}

const SENTENCE_END = /[।.!"'”’)]$/;

/**
 * Publishers append "related stories" as a run of bare headlines after the article. Article paragraphs end with a
 * sentence terminator (। . !); headlines do not. A trailing run of >= 2 short unterminated lines is dropped, but only
 * when enough real article text precedes it (never strips a short article's last line).
 */
function dropTrailingHeadlineList(lines: string[]): string[] {
  let i = lines.length;
  while (i > 0 && lines[i - 1]!.length < 220 && !SENTENCE_END.test(lines[i - 1]!)) i--;
  if (lines.length - i < 2) return lines;
  const kept = lines.slice(0, i);
  return kept.join("\n").length >= 200 ? kept : lines;
}

type FeedItemLike = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/**
 * The best text the feed item carries. `content:encoded` (the article) wins when it is meaningfully longer than the
 * excerpt; otherwise the longest of the standard fields is used. Returns null when the item carries no text at all.
 */
export function pickFeedBodyText(item: FeedItemLike): { text: string; method: TextEnrichmentMethod } | null {
  // rss-parser's customFields map <content:encoded> to `contentEncoded` (see rss-fetch.ts); keep the raw key as a fallback.
  const encoded = cleanArticleText(str(item.contentEncoded) || str(item["content:encoded"]));
  const excerpt = [item.content, item.summary, item.contentSnippet, item.description]
    .map((v) => cleanArticleText(str(v)))
    .sort((a, b) => b.length - a.length)[0] ?? "";

  const useEncoded = encoded.length > 0 && encoded.length >= excerpt.length;
  const text = (useEncoded ? encoded : excerpt).slice(0, MAX_SOURCE_TEXT_CHARS).trim();
  if (!text) return null;
  return { text, method: useEncoded && encoded.length > excerpt.length * 1.2 ? "feed_content_encoded" : "feed_description" };
}

/**
 * description (an excerpt) is usually the first paragraph(s) of the full text: concatenating both double-counts it and
 * inflates the "evidence length" the body gate measures. Keep the longer text when one contains the other's lead.
 */
export function joinDescriptionAndContent(description: string | null | undefined, content: string | null | undefined): string {
  const d = (description ?? "").trim();
  const c = (content ?? "").trim();
  if (!d) return c;
  if (!c) return d;
  const lead = d.slice(0, Math.min(60, d.length));
  if (c.includes(lead)) return c.length >= d.length ? c : d;
  if (d.includes(c.slice(0, Math.min(60, c.length)))) return d.length >= c.length ? d : c;
  return `${d}\n\n${c}`;
}
