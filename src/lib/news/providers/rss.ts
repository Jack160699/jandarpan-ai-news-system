/**
 * RSS provider — Chhattisgarh & Hindi local news
 */

import Parser from "rss-parser";
import { isValidHttpUrl, parsePublishedAt } from "@/lib/news/normalize";
import type { NormalizedArticle, ProviderFetchResult } from "@/lib/news/types";

export type RssFeedConfig = {
  id: string;
  name: string;
  url: string;
  language: "hi" | "en";
  region: "chhattisgarh";
};

/** Chhattisgarh / Hindi regional feeds (update URLs if a source changes endpoints) */
export const CG_RSS_FEEDS: RssFeedConfig[] = [
  {
    id: "bhaskar-raipur",
    name: "Dainik Bhaskar — Raipur",
    url: "https://www.bhaskar.com/rss/raipur",
    language: "hi",
    region: "chhattisgarh",
  },
  {
    id: "patrika-cg",
    name: "Patrika — Chhattisgarh",
    url: "https://www.patrika.com/rss/chhattisgarh-news.xml",
    language: "hi",
    region: "chhattisgarh",
  },
  {
    id: "haribhoomi",
    name: "Haribhoomi",
    url: "https://www.haribhoomi.com/feed/",
    language: "hi",
    region: "chhattisgarh",
  },
  {
    id: "naidunia-cg",
    name: "NaiDunia — Chhattisgarh",
    url: "https://www.naidunia.com/rss/chhattisgarh",
    language: "hi",
    region: "chhattisgarh",
  },
  {
    id: "prabhat-khabar-cg",
    name: "Prabhat Khabar — CG",
    url: "https://www.prabhatkhabar.com/state/chhattisgarh/feed",
    language: "hi",
    region: "chhattisgarh",
  },
];

const parser = new Parser({
  timeout: 15_000,
  headers: {
    "User-Agent": "CG-Bhaskar-Ingest/1.0 (+https://newspaper-motion.vercel.app)",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: false }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: false }],
    ],
  },
});

function extractImage(item: Parser.Item & Record<string, unknown>): string | null {
  const enclosure = item.enclosure?.url;
  if (enclosure && isValidHttpUrl(enclosure)) return enclosure;

  const mediaContent = item.mediaContent as { $?: { url?: string } } | undefined;
  if (mediaContent?.$?.url && isValidHttpUrl(mediaContent.$.url)) {
    return mediaContent.$.url;
  }

  const mediaThumbnail = item.mediaThumbnail as { $?: { url?: string } } | undefined;
  if (mediaThumbnail?.$?.url && isValidHttpUrl(mediaThumbnail.$.url)) {
    return mediaThumbnail.$.url;
  }

  const content = item.content ?? item["content:encoded"] ?? "";
  const imgMatch = String(content).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1] && isValidHttpUrl(imgMatch[1])) return imgMatch[1];

  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapRssItem(
  item: Parser.Item,
  feed: RssFeedConfig
): NormalizedArticle | null {
  const title = item.title?.trim();
  const articleUrl = item.link?.trim() || item.guid?.trim();

  if (!title || !articleUrl || !isValidHttpUrl(articleUrl)) return null;

  const rawContent =
    item.contentSnippet ??
    (item.content ? stripHtml(String(item.content)) : null) ??
    item.summary ??
    null;

  const description =
    item.contentSnippet?.trim() ??
    (item.summary ? stripHtml(String(item.summary)).slice(0, 500) : null);

  const imageUrl = extractImage(item as Parser.Item & Record<string, unknown>);

  return {
    title,
    description,
    content: rawContent ? String(rawContent).slice(0, 8000) : null,
    image_url: imageUrl,
    source: feed.name,
    author: item.creator?.trim() ?? null,
    category: "local",
    published_at: parsePublishedAt(item.isoDate ?? item.pubDate ?? null),
    article_url: articleUrl,
    provider: "rss",
    language: feed.language,
    region: "chhattisgarh",
  };
}

export async function fetchRssFeed(
  feed: RssFeedConfig
): Promise<{ articles: NormalizedArticle[]; error?: string }> {
  try {
    const parsed = await parser.parseURL(feed.url);
    const articles =
      parsed.items
        ?.map((item) => mapRssItem(item, feed))
        .filter((a): a is NormalizedArticle => a !== null) ?? [];

    console.log(`[rss] ${feed.id}: ${articles.length} articles`);
    return { articles };
  } catch (err) {
    const message = err instanceof Error ? err.message : "RSS parse failed";
    console.error(`[rss] ${feed.id}:`, message);
    return { articles: [], error: message };
  }
}

export async function fetchRssAll(): Promise<ProviderFetchResult> {
  const startedAt = Date.now();

  const results = await Promise.all(
    CG_RSS_FEEDS.map(async (feed) => {
      const result = await fetchRssFeed(feed);
      return { feed, ...result };
    })
  );

  const articles: NormalizedArticle[] = [];
  const errors: string[] = [];
  let fetched = 0;

  for (const r of results) {
    fetched += r.articles.length;
    if (r.error) errors.push(`${r.feed.id}: ${r.error}`);
    articles.push(...r.articles);
  }

  return {
    provider: "rss",
    label: "RSS (Chhattisgarh)",
    articles,
    fetched,
    valid: articles.length,
    errors,
    durationMs: Date.now() - startedAt,
  };
}
