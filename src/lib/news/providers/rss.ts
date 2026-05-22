/**
 * RSS provider — Chhattisgarh regional newsroom ingestion
 * Sources: rss-sources.ts · Health: rss-health.ts · Parse: rss-fetch.ts
 */

import type Parser from "rss-parser";
import { detectLanguage } from "@/lib/news/language";
import {
  canonicalArticleUrl,
  dedupeArticles,
  isPlaceholderImage,
  isValidHttpUrl,
  parsePublishedAt,
  validateArticle,
} from "@/lib/news/normalize";
import {
  isSourceSkipped,
  loadSourceHealth,
  recordSourceFailure,
  recordSourceSuccess,
} from "@/lib/news/rss-health";
import { parseFeedResilient } from "@/lib/news/rss-fetch";
import {
  regionToDbRegion,
  RSS_PARALLEL_BATCH,
  RSS_SOURCES,
  type RSSSource,
} from "@/lib/news/providers/rss-sources";
import type {
  NormalizedArticle,
  ProviderFetchResult,
  RssSourceAnalytics,
} from "@/lib/news/types";

export type RssFetchResult = ProviderFetchResult & {
  sourceAnalytics: RssSourceAnalytics[];
};

function extractImage(item: Parser.Item & Record<string, unknown>): string | null {
  const enclosure = item.enclosure?.url;
  if (enclosure && isValidHttpUrl(enclosure) && !isPlaceholderImage(enclosure)) {
    return enclosure;
  }

  const mediaContent = item.mediaContent as { $?: { url?: string } } | undefined;
  if (
    mediaContent?.$?.url &&
    isValidHttpUrl(mediaContent.$.url) &&
    !isPlaceholderImage(mediaContent.$.url)
  ) {
    return mediaContent.$.url;
  }

  const mediaThumbnail = item.mediaThumbnail as { $?: { url?: string } } | undefined;
  if (
    mediaThumbnail?.$?.url &&
    isValidHttpUrl(mediaThumbnail.$.url) &&
    !isPlaceholderImage(mediaThumbnail.$.url)
  ) {
    return mediaThumbnail.$.url;
  }

  const encoded = item.contentEncoded ?? item.content ?? item["content:encoded"] ?? "";
  const imgMatch = String(encoded).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1] && isValidHttpUrl(imgMatch[1]) && !isPlaceholderImage(imgMatch[1])) {
    return imgMatch[1];
  }

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
  source: RSSSource
): NormalizedArticle | null {
  const title = item.title?.trim();
  const rawLink = item.link?.trim() || item.guid?.trim();
  if (!title || !rawLink) return null;

  const articleUrl = canonicalArticleUrl(rawLink);
  if (!isValidHttpUrl(articleUrl)) return null;

  const rawContent =
    item.contentSnippet ??
    (item.content ? stripHtml(String(item.content)) : null) ??
    (item.summary ? stripHtml(String(item.summary)) : null);

  const description =
    item.contentSnippet?.trim() ??
    (item.summary ? stripHtml(String(item.summary)).slice(0, 600) : null) ??
    (rawContent ? String(rawContent).slice(0, 600) : null);

  const textForLang = `${title} ${description ?? ""}`;
  const language = detectLanguage(textForLang, source.language);

  const imageUrl = extractImage(item as Parser.Item & Record<string, unknown>);

  return {
    title,
    description,
    content: rawContent ? String(rawContent).slice(0, 8000) : null,
    image_url: imageUrl,
    source: source.name,
    author: item.creator?.trim() ?? null,
    category: source.category,
    published_at: parsePublishedAt(item.isoDate ?? item.pubDate ?? null),
    article_url: articleUrl,
    provider: "rss",
    language,
    region: regionToDbRegion(source.region),
  };
}

async function fetchOneSource(
  source: RSSSource,
  health: Awaited<ReturnType<typeof loadSourceHealth>>
): Promise<RssSourceAnalytics & { articles: NormalizedArticle[] }> {
  if (isSourceSkipped(source, health)) {
    return {
      source: source.id,
      fetched: 0,
      valid: 0,
      rejected: 0,
      duplicates: 0,
      skipped: true,
      articles: [],
    };
  }

  const { feed, error } = await parseFeedResilient(source);

  if (error || !feed.items?.length) {
    await recordSourceFailure(source, health, error ?? "empty feed");
    return {
      source: source.id,
      fetched: 0,
      valid: 0,
      rejected: 0,
      duplicates: 0,
      error: error ?? "empty feed",
      articles: [],
    };
  }

  const rawItems = feed.items;
  let rejected = 0;
  const mapped: (NormalizedArticle & { _priority: number })[] = [];

  for (const item of rawItems) {
    const article = mapRssItem(item, source);
    if (!article) {
      rejected++;
      continue;
    }

    const check = validateArticle(article, { strictRss: true });
    if (!check.valid) {
      rejected++;
      continue;
    }

    mapped.push({ ...article, _priority: source.priority });
  }

  const { unique, skipped } = dedupeArticles(mapped, { fuzzy: true });

  await recordSourceSuccess(source, health);

  console.log(
    `[rss] ${source.id}: fetched=${rawItems.length} valid=${unique.length} rejected=${rejected} dup=${skipped}`
  );

  return {
    source: source.id,
    fetched: rawItems.length,
    valid: unique.length,
    rejected,
    duplicates: skipped,
    articles: unique,
  };
}

async function runBatch(
  sources: RSSSource[],
  health: Awaited<ReturnType<typeof loadSourceHealth>>
): Promise<Array<RssSourceAnalytics & { articles: NormalizedArticle[] }>> {
  const results: Array<RssSourceAnalytics & { articles: NormalizedArticle[] }> = [];

  for (let i = 0; i < sources.length; i += RSS_PARALLEL_BATCH) {
    const batch = sources.slice(i, i + RSS_PARALLEL_BATCH);
    const batchResults = await Promise.all(
      batch.map((source) => fetchOneSource(source, health))
    );
    results.push(...batchResults);
  }

  return results;
}

export async function fetchRssAll(): Promise<RssFetchResult> {
  const startedAt = Date.now();
  const health = await loadSourceHealth();

  const activeSources = [...RSS_SOURCES]
    .filter((s) => !isSourceSkipped(s, health))
    .sort((a, b) => b.priority - a.priority);

  const results = await runBatch(activeSources, health);

  const sourceAnalytics: RssSourceAnalytics[] = results.map(
    ({ source, fetched, valid, rejected, duplicates, skipped, error }) => ({
      source,
      fetched,
      valid,
      rejected,
      duplicates,
      skipped,
      error,
    })
  );

  const merged = results.flatMap((r) => {
    const src = RSS_SOURCES.find((s) => s.id === r.source);
    const priority = src?.priority ?? 0;
    return r.articles.map((a) => ({ ...a, _priority: priority }));
  });

  const { unique, skipped, fuzzySkipped } = dedupeArticles(
    merged as (NormalizedArticle & { _priority?: number })[],
    { fuzzy: true }
  );

  const errors = results
    .filter((r) => r.error)
    .map((r) => `${r.source}: ${r.error}`);

  const totalFetched = sourceAnalytics.reduce((n, s) => n + s.fetched, 0);
  const totalRejected = sourceAnalytics.reduce((n, s) => n + s.rejected, 0);

  console.log(
    `[rss] Total: ${unique.length} articles, ${totalRejected} rejected, ${skipped} cross-feed dupes (${fuzzySkipped} fuzzy)`
  );

  return {
    provider: "rss",
    label: "RSS (Chhattisgarh regional)",
    articles: unique,
    fetched: totalFetched,
    valid: unique.length,
    errors,
    durationMs: Date.now() - startedAt,
    sourceAnalytics,
  };
}

export { RSS_SOURCES } from "@/lib/news/providers/rss-sources";
export type { RSSSource } from "@/lib/news/providers/rss-sources";
