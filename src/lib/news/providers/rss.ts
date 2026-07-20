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
} from "@/lib/news/normalize";
import {
  isValidNewsArticle,
  normalizeNewsEncoding,
  safeParsePublishedAt,
} from "@/lib/news/sanitize-article";
import { enrichRssArticlesBatch } from "@/lib/news/rss-enrich";
import { parseFeedResilient } from "@/lib/news/rss-fetch";
import {
  isRssSourceBlocked,
  isSourceSkipped,
  loadSourceHealth,
  recordSourceFailure,
  recordSourceSuccess,
} from "@/lib/news/rss-health";
import { filterKnownSignalDuplicates } from "@/lib/news/ingestion/early-dedup";
import {
  advanceSourceCursorSafe,
  buildSourceKey,
  filterArticlesByPublishedAfter,
  loadIngestionSourceState,
  publishedAfterIsoFromCursor,
  upsertIngestionSourceState,
} from "@/lib/news/ingestion/source-state";
import {
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
    const title = normalizeNewsEncoding(item.title);
    const rawLink =
      normalizeNewsEncoding(item.link) ||
      normalizeNewsEncoding(item.guid) ||
      "";
    if (!title || title.length < 4) return null;
    if (!rawLink) return null;

    let articleUrl = rawLink;
    try {
      if (isValidHttpUrl(rawLink)) {
        articleUrl = canonicalArticleUrl(rawLink);
      } else if (rawLink.startsWith("//")) {
        articleUrl = canonicalArticleUrl(`https:${rawLink}`);
      } else if (!rawLink.includes("://") && rawLink.includes(".")) {
        articleUrl = canonicalArticleUrl(`https://${rawLink}`);
      }
    } catch {
      articleUrl = rawLink;
    }

    const rawContent =
      item.contentSnippet ??
      (item.content ? stripHtml(String(item.content)) : null) ??
      (item.summary ? stripHtml(String(item.summary)) : null);

    let description =
      item.contentSnippet?.trim() ??
      (item.summary ? stripHtml(String(item.summary)).slice(0, 600) : null) ??
      (rawContent ? String(rawContent).slice(0, 600) : null);

    if (!description || description.length < 4) {
      description = title;
    }

    const rssCandidates = extractImagesFromRssItem(
      item as Parser.Item & Record<string, unknown>
    );
    const bestImage = pickBestImageCandidate(rssCandidates);
    const imageUrl = bestImage
      ? normalizeImageUrl(bestImage.url, articleUrl)
      : null;

    const published_at = safeParsePublishedAt(
      parsePublishedAt(item.isoDate ?? item.pubDate ?? null) ??
        item.isoDate ??
        item.pubDate
    );

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

function validateRssArticle(article: NormalizedArticle): boolean {
  return isValidNewsArticle(article).valid;
}

export async function fetchRssSourceBatch(
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
    const blocked = await isRssSourceBlocked(source, health);
    if (blocked.skipped) {
      return { ...empty, skipped: true, error: blocked.reason ?? "skipped" };
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

    // Incremental window: drop items older than last cursor − overlap.
    const sourceKey = buildSourceKey("rss", source.id);
    const state = await loadIngestionSourceState(sourceKey);
    const publishedAfter = publishedAfterIsoFromCursor(
      state?.last_item_timestamp ?? null
    );
    const { kept: windowed, filtered: incrementalFiltered } =
      filterArticlesByPublishedAfter(mapped, publishedAfter);

    // Early DB dedup BEFORE page enrichment (largest RSS waste reduction).
    const early = await filterKnownSignalDuplicates(windowed);
    const earlyDupes =
      early.metrics.earlyDuplicateKnownSignal + early.metrics.earlyDuplicateBatch;

    const { articles: enrichedRaw, recoveredCount } =
      await enrichRssArticlesBatch(early.novel, RSS_PAGE_ENRICH_LIMIT);

    const priority = sourceEffectivePriority(source);
    const enriched = enrichedRaw.map((a) => ({ ...a, _priority: priority }));

    const validated: (NormalizedArticle & { _priority: number })[] = [];
    for (const a of enriched) {
      if (!validateRssArticle(a)) {
        rejected++;
        continue;
      }
      validated.push({ ...a, _priority: priority });
    }

    const { unique, skipped } = dedupeArticles(validated, { fuzzy: true });

    if (unique.length > 0) {
      await recordSourceSuccess(source, health, unique.length);
      const newest = unique
        .map((a) => a.published_at)
        .filter((v): v is string => Boolean(v))
        .sort()
        .at(-1);
      if (newest) {
        await advanceSourceCursorSafe({
          sourceKey,
          providerFamily: "rss",
          expectedPrevious: state?.last_item_timestamp ?? null,
          nextTimestamp: newest,
          newItemCount: unique.length,
        });
      } else {
        await upsertIngestionSourceState({
          source_key: sourceKey,
          provider_family: "rss",
          last_successful_at: new Date().toISOString(),
          health_state: "healthy",
        });
      }
    } else if (mapped.length > 0 && early.novel.length === 0) {
      // Feed had items but all known — still record success / empty-new run.
      await recordSourceSuccess(source, health, 0);
      await upsertIngestionSourceState({
        source_key: sourceKey,
        provider_family: "rss",
        last_successful_at: new Date().toISOString(),
        consecutive_empty_runs: (state?.consecutive_empty_runs ?? 0) + 1,
        health_state: "healthy",
      });
    }

    return {
      source: source.id,
      fetched: rawItems.length,
      valid: unique.length,
      rejected,
      duplicates: skipped + earlyDupes + incrementalFiltered,
      articles: unique,
      recovered: recoveredCount,
      earlyDuplicates: earlyDupes,
      incrementalFiltered,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "rss_fetch_failed";
    await recordSourceFailure(source, health, message);
    return { ...empty, error: message };
  }
}

export async function fetchRssAll(): Promise<RssFetchResult> {
  const startedAt = Date.now();

  try {
    const health = await loadSourceHealth();

    const activeSources = [...RSS_SOURCES]
      .filter((s) => !isSourceSkipped(s, health))
      .sort((a, b) => sourceEffectivePriority(b) - sourceEffectivePriority(a));

    const results: Array<
      RssSourceAnalytics & { articles: NormalizedArticle[]; recovered: number }
    > = [];

    for (let i = 0; i < activeSources.length; i += RSS_PARALLEL_BATCH) {
      const batch = activeSources.slice(i, i + RSS_PARALLEL_BATCH);
      const batchResults = await Promise.allSettled(
        batch.map((source) => fetchRssSourceBatch(source, health))
      );
      for (let j = 0; j < batchResults.length; j++) {
        const entry = batchResults[j];
        if (entry.status === "fulfilled") {
          results.push(entry.value);
        } else {
          const source = batch[j];
          const msg =
            entry.reason instanceof Error
              ? entry.reason.message
              : "source failed";
          results.push({
            source: source.id,
            fetched: 0,
            valid: 0,
            rejected: 0,
            duplicates: 0,
            articles: [],
            recovered: 0,
            error: msg,
          });
        }
      }
    }

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
