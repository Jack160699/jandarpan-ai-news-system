/**
 * Resilient RSS fetch — timeout, UTF-8, malformed XML recovery
 */

import Parser from "rss-parser";
import type { RSSSource } from "@/lib/news/providers/rss-sources";
import { RSS_FEED_TIMEOUT_MS } from "@/lib/news/providers/rss-sources";

const USER_AGENT =
  "CG-Bhaskar-Ingest/2.0 (+https://newspaper-motion.vercel.app; regional RSS)";

const parser = new Parser({
  timeout: RSS_FEED_TIMEOUT_MS,
  headers: {
    "User-Agent": USER_AGENT,
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    "Accept-Charset": "utf-8",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

function sanitizeXml(xml: string): string {
  return xml
    .replace(/^\uFEFF/, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/g, "&amp;")
    .trim();
}

async function fetchRawFeed(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml",
        "Accept-Language": "hi-IN,hi;q=0.9,en;q=0.8",
      },
      cache: "no-store",
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const buffer = await res.arrayBuffer();
    const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    return sanitizeXml(utf8);
  } finally {
    clearTimeout(timer);
  }
}

/** Fallback: extract minimal items when XML is badly formed */
function regexExtractItems(xml: string): Parser.Item[] {
  const items: Parser.Item[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks.slice(0, 30)) {
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1];
    const link = block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1];
    const desc = block.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i)?.[1];
    const pubDate = block.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i)?.[1];

    if (title && link) {
      items.push({
        title: title.trim(),
        link: link.trim(),
        contentSnippet: desc?.trim(),
        pubDate: pubDate?.trim(),
      });
    }
  }

  return items;
}

export async function parseFeedResilient(
  source: RSSSource
): Promise<{ feed: { title?: string; items?: Parser.Item[] }; error?: string }> {
  const timeoutMs = RSS_FEED_TIMEOUT_MS;

  try {
    const xml = await fetchRawFeed(source.url, timeoutMs);
    const feed = await parser.parseString(xml);
    return { feed };
  } catch (primaryErr) {
    const msg = primaryErr instanceof Error ? primaryErr.message : "parse failed";

    try {
      const xml = await fetchRawFeed(source.url, timeoutMs);
      const items = regexExtractItems(xml);
      if (items.length > 0) {
        console.warn(`[rss-fetch] ${source.id}: recovered ${items.length} items via regex`);
        return {
          feed: { title: source.name, items },
        };
      }
    } catch {
      /* fall through */
    }

    try {
      const feed = await parser.parseURL(source.url);
      return { feed };
    } catch {
      return { feed: { items: [] }, error: msg };
    }
  }
}
