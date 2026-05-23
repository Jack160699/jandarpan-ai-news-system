/**
 * Resilient RSS fetch — gzip, UTF-8, CDATA, entities, retry
 */

import Parser from "rss-parser";
import type { RSSSource } from "@/lib/news/providers/rss-sources";
import {
  RSS_FEED_TIMEOUT_MS,
  RSS_MAX_RETRIES,
} from "@/lib/news/providers/rss-sources";
import {
  getCachedFeedXml,
  setCachedFeedXml,
} from "@/lib/news/rss-feed-cache";

const USER_AGENT =
  "Mozilla/5.0 (compatible; Hamar-Chhattisgarh-RSS/2.1; +https://newspaper-motion.vercel.app)";

const parser = new Parser({
  timeout: RSS_FEED_TIMEOUT_MS,
  headers: {
    "User-Agent": USER_AGENT,
    Accept:
      "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "hi-IN,hi;q=0.9,en;q=0.8",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
      ["content:encoded", "contentEncoded"],
    ],
  },
});

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    )
    .trim();
}

function normalizeCdata(xml: string): string {
  return xml.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, (_, inner) => {
    const escaped = inner
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped;
  });
}

export function sanitizeXml(xml: string): string {
  return normalizeCdata(
    decodeHtmlEntities(
      xml
        .replace(/^\uFEFF/, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    )
  )
    .replace(/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/g, "&amp;")
    .trim();
}

async function fetchRawFeed(
  url: string,
  timeoutMs: number,
  retries = RSS_MAX_RETRIES
): Promise<string> {
  const cached = getCachedFeedXml(url);
  if (cached) return cached;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept:
            "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
          "Accept-Encoding": "gzip, deflate, br",
          "Accept-Language": "hi-IN,hi;q=0.9,en;q=0.8",
        },
        cache: "no-store",
        redirect: "follow",
      });

      clearTimeout(timer);

      if (res.status >= 500 || res.status === 501) {
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const buffer = await res.arrayBuffer();
      const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
      const clean = sanitizeXml(utf8);
      setCachedFeedXml(url, clean);
      return clean;
    } catch (err) {
      clearTimeout(timer);
      lastError = err instanceof Error ? err : new Error("fetch failed");
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new Error("RSS fetch failed");
}

function regexExtractItems(xml: string): Parser.Item[] {
  const items: Parser.Item[] = [];
  const blocks =
    xml.match(/<item[\s\S]*?<\/item>/gi) ??
    xml.match(/<entry[\s\S]*?<\/entry>/gi) ??
    [];

  for (const block of blocks.slice(0, 40)) {
    const titleRaw =
      block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "";
    const linkRaw =
      block.match(/<link[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i)?.[1] ??
      block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
    const descRaw =
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ??
      block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ??
      "";
    const pubDate =
      block.match(/<pubDate[^>]*>([^<]+)<\/pubDate>/i)?.[1] ??
      block.match(/<published[^>]*>([^<]+)<\/published>/i)?.[1];

    const title = decodeHtmlEntities(titleRaw.replace(/<[^>]+>/g, "").trim());
    const link = decodeHtmlEntities((linkRaw ?? "").trim());

    if (title && link) {
      items.push({
        title,
        link,
        contentSnippet: decodeHtmlEntities(
          descRaw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
        ).slice(0, 600),
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
    const items = feed.items ?? [];
    if (items.length > 0) {
      return { feed: { title: feed.title ?? source.name, items } };
    }

    const recovered = regexExtractItems(xml);
    if (recovered.length > 0) {
      return { feed: { title: source.name, items: recovered } };
    }

    return { feed: { items: [] }, error: "empty feed" };
  } catch (primaryErr) {
    const msg = primaryErr instanceof Error ? primaryErr.message : "parse failed";

    try {
      const xml = await fetchRawFeed(source.url, timeoutMs, 0);
      const recovered = regexExtractItems(xml);
      if (recovered.length > 0) {
        console.warn(`[rss-fetch] ${source.id}: regex recovered ${recovered.length}`);
        return { feed: { title: source.name, items: recovered } };
      }
    } catch {
      /* ignore */
    }

    return { feed: { items: [] }, error: msg };
  }
}
