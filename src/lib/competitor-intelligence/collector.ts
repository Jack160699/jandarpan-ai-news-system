/**
 * Competitor Intelligence — crawl orchestrator (read-only)
 */

import {
  COMPETITOR_MAX_ITEMS_PER_SOURCE,
  COMPETITOR_MAX_PAGE_ENRICHMENTS,
  COMPETITOR_SOURCE_DELAY_MS,
  isCompetitorTrackerEnabled,
} from "@/lib/competitor-intelligence/config";
import { dedupeParsedArticles } from "@/lib/competitor-intelligence/dedupe";
import {
  errorCompetitorIntel,
  logCompetitorIntel,
  warnCompetitorIntel,
} from "@/lib/competitor-intelligence/logger";
import {
  enrichCompetitorArticleFromHtml,
  parseCompetitorFeed,
} from "@/lib/competitor-intelligence/parser";
import { isUrlAllowedByRobots } from "@/lib/competitor-intelligence/robots";
import {
  createCompetitorRun,
  finishCompetitorRun,
  listEnabledCompetitorSources,
  saveCompetitorArticle,
} from "@/lib/competitor-intelligence/repository";
import type {
  CompetitorCrawlResult,
  CompetitorSourceRow,
} from "@/lib/competitor-intelligence/types";
import { isSupabaseConfigured } from "@/lib/supabase";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function crawlCompetitorSource(
  source: CompetitorSourceRow
): Promise<{
  found: number;
  saved: number;
  duplicates: number;
  errors: string[];
}> {
  const feedUrl = source.feed_url?.trim() || source.homepage;
  const errors: string[] = [];
  let saved = 0;
  let duplicates = 0;

  const allowed = await isUrlAllowedByRobots(feedUrl);
  if (!allowed) {
    warnCompetitorIntel("source_skip", {
      source: source.name,
      reason: "robots_disallow",
      url: feedUrl,
    });
    return { found: 0, saved: 0, duplicates: 0, errors: ["robots_disallow"] };
  }

  let parsed;
  try {
    parsed = await parseCompetitorFeed(feedUrl, {
      language: source.language,
      sourceName: source.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "feed_parse_failed";
    errorCompetitorIntel("errors", { source: source.name, message });
    return { found: 0, saved: 0, duplicates: 0, errors: [message] };
  }

  const limited = dedupeParsedArticles(parsed).slice(
    0,
    COMPETITOR_MAX_ITEMS_PER_SOURCE
  );

  logCompetitorIntel("source_fetch", {
    source: source.name,
    found: limited.length,
    feedUrl,
  });

  for (let i = 0; i < limited.length; i += 1) {
    let article = limited[i]!;

    if (i < COMPETITOR_MAX_PAGE_ENRICHMENTS) {
      const pageAllowed = await isUrlAllowedByRobots(article.url);
      if (pageAllowed) {
        article = await enrichCompetitorArticleFromHtml(article);
        await sleep(500);
      }
    }

    try {
      const result = await saveCompetitorArticle({
        sourceId: source.id,
        article,
      });
      if (result === "duplicate") duplicates += 1;
      else saved += 1;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "article_save_failed";
      errors.push(`${source.name}:${message}`);
      errorCompetitorIntel("errors", {
        source: source.name,
        url: article.url,
        message,
      });
    }
  }

  if (saved > 0) {
    logCompetitorIntel("articles_saved", {
      source: source.name,
      saved,
      duplicates,
    });
  }
  if (duplicates > 0) {
    logCompetitorIntel("duplicates", { source: source.name, duplicates });
  }

  return { found: limited.length, saved, duplicates, errors };
}

export async function runCompetitorIntelligenceCrawl(): Promise<CompetitorCrawlResult> {
  const startedAt = Date.now();

  if (!isCompetitorTrackerEnabled()) {
    return {
      ok: true,
      runId: null,
      status: "skipped",
      articlesFound: 0,
      articlesSaved: 0,
      duplicates: 0,
      errors: [],
      durationMs: Date.now() - startedAt,
      sourcesCrawled: 0,
      skippedReason: "SEO_COMPETITOR_TRACKER_not_enabled",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      runId: null,
      status: "failed",
      articlesFound: 0,
      articlesSaved: 0,
      duplicates: 0,
      errors: ["supabase_not_configured"],
      durationMs: Date.now() - startedAt,
      sourcesCrawled: 0,
    };
  }

  const runId = await createCompetitorRun();
  logCompetitorIntel("crawl_start", { runId });

  const sources = await listEnabledCompetitorSources();
  let articlesFound = 0;
  let articlesSaved = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (const source of sources) {
    const result = await crawlCompetitorSource(source);
    articlesFound += result.found;
    articlesSaved += result.saved;
    duplicates += result.duplicates;
    errors.push(...result.errors);
    await sleep(COMPETITOR_SOURCE_DELAY_MS);
  }

  const status: CompetitorCrawlResult["status"] =
    errors.length > 0 && articlesSaved === 0 ? "failed" : "completed";

  await finishCompetitorRun({
    runId,
    status,
    articlesFound,
    articlesSaved,
    errors,
    metadata: {
      duplicates,
      sourcesCrawled: sources.length,
      durationMs: Date.now() - startedAt,
    },
  });

  logCompetitorIntel("crawl_finish", {
    runId,
    status,
    articlesFound,
    articlesSaved,
    duplicates,
    errors: errors.length,
    durationMs: Date.now() - startedAt,
  });

  return {
    ok: status !== "failed",
    runId,
    status,
    articlesFound,
    articlesSaved,
    duplicates,
    errors,
    durationMs: Date.now() - startedAt,
    sourcesCrawled: sources.length,
  };
}
