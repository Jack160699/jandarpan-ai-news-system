/**
 * RSS provider — hardened Chhattisgarh regional ingestion
 */

import type Parser from "rss-parser";
import { detectLanguage } from "@/lib/news/language";
import {
  extractImagesFromRssItem,
  normalizeImageUrl,
  pickBestImageCandidate,
} from "@/lib/news/images/extract";
import {
  canonicalArticleUrl,
  dedupeArticles,
  isValidHttpUrl,
  parsePublishedAt,
  validateArticle,
} from "@/lib/news/normalize";
import { enrichRssArticlesBatch } from "@/lib/news/rss-enrich";
import { parseFeedResilient } from "@/lib/news/rss-fetch";
import {
  isSourceSkipped,
  loadSourceHealth,
  recordSourceFailure,
  recordSourceSuccess,
} from "@/lib/news/rss-health";
import {
  isGoogleNewsSource,
  regionToDbRegion,
  RSS_PAGE_ENRICH_LIMIT,
  RSS_PARALLEL_BATCH,
  RSS_SOURCES,
  sourceEffectivePriority,
  type RSSSource,
} from "@/lib/news/providers/rss-sources";
import type {
  NormalizedArticle,
  ProviderFetchResult,
  RssSourceAnalytics,
} from "@/lib/news/types";

export type RssFetchResult = ProviderFetchResult & {
  sourceAnalytics: RssSourceAnalytics[];
  healthySources: string[];
  failedSources: string[];
  articlesRecoveredByFallback: number;
};

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
  try {
    const title = item.title?.trim();
    const rawLink = item.link?.trim() || item.guid?.trim();
    if (!title || title.length < 8 || !rawLink) return null;

    const articleUrl = canonicalArticleUrl(rawLink);
    if (!isValidHttpUrl(articleUrl)) return null;

    const rawContent =
      item.contentSnippet ??
      (item.content ? stripHtml(String(item.content)) : null) ??
      (item.summary ? stripHtml(String(item.summary)) : null);

    let description =
      item.contentSnippet?.trim() ??
      (item.summary ? stripHtml(String(item.summary)).slice(0, 600) : null) ??
      (rawContent ? String(rawContent).slice(0, 600) : null);

    if (!description || description.length < 20) {
      description = title;
    }

    const rssCandidates = extractImagesFromRssItem(
      item as Parser.Item & Record<string, unknown>
    );
    const bestImage = pickBestImageCandidate(rssCandidates);
    const imageUrl = bestImage
      ? normalizeImageUrl(bestImage.url, articleUrl)
      : null;

    const published_at =
      parsePublishedAt(item.isoDate ?? item.pubDate ?? null) ??
      new Date().toISOString();

    return {
      title,
      description,
      content: rawContent ? String(rawContent).slice(0, 8000) : description,
      image_url: imageUrl,
      source: source.name,
      author: item.creator?.trim() ?? null,
      category: source.category,
      published_at,
      article_url: articleUrl,
      provider: "rss",
      language: detectLanguage(`${title} ${description}`, source.language),
      region: regionToDbRegion(source.region),
    };
  } catch {
    return null;
  }
}

function validateRssArticle(
  article: NormalizedArticle,
  sourceId: string
): { valid: boolean; reason?: string } {
  const relaxed = isGoogleNewsSource(sourceId);
  const check = validateArticle(article, {
    strictRss: !relaxed,
    maxAgeDays: relaxed ? 14 : undefined,
  });

  if (check.valid) return check;

  if (relaxed && article.title.length >= 10 && article.description) {
    return { valid: true };
  }

  return check;
}

async function fetchOneSource(
  source: RSSSource,
  health: Awaited<ReturnType<typeof loadSourceHealth>>
): Promise<
  RssSourceAnalytics & { articles: NormalizedArticle[]; recovered: number }
> {
  const empty = {
    source: source.id,
    fetched: 0,
    valid: 0,
    rejected: 0,
    duplicates: 0,
    articles: [] as NormalizedArticle[],
    recovered: 0,
  };

  try {
    if (isSourceSkipped(source, health)) {
      return { ...empty, skipped: true };
    }

    const { feed, error } = await parseFeedResilient(source);

    if (error || !feed.items?.length) {
      await recordSourceFailure(source, health, error ?? "empty feed");
      return { ...empty, error: error ?? "empty feed" };
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
      mapped.push({
        ...article,
        _priority: sourceEffectivePriority(source),
      });
    }

    const { articles: enrichedRaw, recoveredCount } =
      await enrichRssArticlesBatch(mapped, RSS_PAGE_ENRICH_LIMIT);

    const priority = sourceEffectivePriority(source);
    const enriched = enrichedRaw.map((a) => ({ ...a, _priority: priority }));

    const validated: (NormalizedArticle & { _priority: number })[] = [];
    for (const a of enriched) {
      const check = validateRssArticle(a, source.id);
      if (!check.valid) {
        rejected++;
        continue;
      }
      validated.push({ ...a, _priority: priority });
    }

    const { unique, skipped } = dedupeArticles(validated, { fuzzy: true });

    if (unique.length > 0) {
      await recordSourceSuccess(source, health, unique.length);
    } else {
      await recordSourceFailure(source, health, "no valid articles after filter");
    }

    console.log(
      `[rss] ${source.id}: raw=${rawItems.length} valid=${unique.length} rejected=${rejected} recovered=${recoveredCount}`
    );

    return {
      source: source.id,
      fetched: rawItems.length,
      valid: unique.length,
      rejected,
      duplicates: skipped,
      articles: unique,
      recovered: recoveredCount,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "source crash";
    console.error(`[rss] ${source.id} crashed:`, msg);
    await recordSourceFailure(source, health, msg).catch(() => {});
    return { ...empty, error: msg };
  }
}

async function runBatch(
  sources: RSSSource[],
  health: Awaited<ReturnType<typeof loadSourceHealth>>
): Promise<
  Array<RssSourceAnalytics & { articles: NormalizedArticle[]; recovered: number }>
> {
  const results: Array<
    RssSourceAnalytics & { articles: NormalizedArticle[]; recovered: number }
  > = [];

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

  try {
    const health = await loadSourceHealth();

    const activeSources = [...RSS_SOURCES]
      .filter((s) => !isSourceSkipped(s, health))
      .sort((a, b) => sourceEffectivePriority(b) - sourceEffectivePriority(a));

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

    const healthySources = results
      .filter((r) => r.valid > 0)
      .map((r) => r.source);
    const failedSources = results
      .filter((r) => r.error || (r.fetched > 0 && r.valid === 0))
      .map((r) => r.source);

    const articlesRecoveredByFallback = results.reduce(
      (n, r) => n + r.recovered,
      0
    );

    const merged = results.flatMap((r) => {
      const src = RSS_SOURCES.find((s) => s.id === r.source);
      const priority = src ? sourceEffectivePriority(src) : 0;
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

    console.log(
      `[rss] Done: ${unique.length} articles from ${healthySources.length}/${RSS_SOURCES.length} sources, recovered=${articlesRecoveredByFallback}, dupes=${skipped}`
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
      healthySources,
      failedSources,
      articlesRecoveredByFallback,
    };
  } catch (fatal) {
    const msg = fatal instanceof Error ? fatal.message : "RSS pipeline failed";
    console.error("[rss] Fatal (non-blocking):", msg);
    return {
      provider: "rss",
      label: "RSS (Chhattisgarh regional)",
      articles: [],
      fetched: 0,
      valid: 0,
      errors: [msg],
      durationMs: Date.now() - startedAt,
      sourceAnalytics: [],
      healthySources: [],
      failedSources: RSS_SOURCES.map((s) => s.id),
      articlesRecoveredByFallback: 0,
    };
  }
}

export { RSS_SOURCES } from "@/lib/news/providers/rss-sources";
export type { RSSSource } from "@/lib/news/providers/rss-sources";
