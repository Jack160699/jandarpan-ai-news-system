/**
 * Database ingestion pipeline — validate, batch upsert, logs, failures
 */

import { createAdminClient } from "@/lib/supabase";
import { titleHash, urlHash, validateArticle } from "@/lib/news/normalize";
import { assignSlugsToRows } from "@/lib/news/slug";
import type { NormalizedArticle } from "@/lib/news/types";
import type { NewsArticleInsert } from "@/lib/types/news-article";
import type { ImageEnrichmentAnalytics } from "@/lib/news/images/enrich";
import type { IngestionStats } from "@/lib/news/types";

const BATCH_SIZE = 40;

export type PipelineResult = IngestionStats & {
  categoryStats: Record<string, number>;
  providerStats: Record<string, number>;
  failures: Array<{ title: string; reason: string; provider: string }>;
  logId: string | null;
};

function toInsertRow(article: NormalizedArticle & { slug?: string }): NewsArticleInsert {
  return {
    title: article.title,
    description: article.description,
    content: article.content,
    image_url: article.image_url,
    source: article.source,
    author: article.author,
    category: article.category,
    article_url: article.article_url,
    published_at: article.published_at,
    provider: article.provider,
    language: article.language,
    region: article.region,
    title_hash: titleHash(article.title),
    url_hash: urlHash(article.article_url),
    slug: article.slug,
  };
}

export async function runIngestionPipeline(
  articles: NormalizedArticle[],
  meta: {
    providers: Array<{ provider: string; fetched: number; valid: number; errors: string[] }>;
    fetchDurationMs: number;
    errors: string[];
    rssAnalytics?: Array<{
      source: string;
      fetched: number;
      valid: number;
      rejected: number;
      duplicates: number;
    }>;
    imageAnalytics?: ImageEnrichmentAnalytics;
    healthySources?: string[];
    failedSources?: string[];
    articlesRecoveredByFallback?: number;
  }
): Promise<PipelineResult> {
  const startedAt = Date.now();
  const supabase = createAdminClient();

  const validated: NormalizedArticle[] = [];
  const failures: PipelineResult["failures"] = [];
  const categoryStats: Record<string, number> = {};
  const providerStats: Record<string, number> = {};

  for (const article of articles) {
    const check = validateArticle(article);
    if (!check.valid) {
      failures.push({
        title: article.title?.slice(0, 120) ?? "unknown",
        reason: check.reason ?? "invalid",
        provider: article.provider,
      });
      continue;
    }

    validated.push(article);
    categoryStats[article.category] = (categoryStats[article.category] ?? 0) + 1;
    providerStats[article.provider] = (providerStats[article.provider] ?? 0) + 1;
  }

  const slugged = assignSlugsToRows(
    validated.map((a) => ({ title: a.title, article_url: a.article_url }))
  );

  const validRows: NewsArticleInsert[] = validated.map((article, i) =>
    toInsertRow({ ...article, slug: slugged[i].slug })
  );

  let inserted = 0;
  let skippedDuplicates = 0;

  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("news_articles")
      .upsert(batch, {
        onConflict: "article_url",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      console.error("[pipeline] batch upsert error:", error.message);
      for (const row of batch) {
        await supabase.from("ingestion_failures").insert({
          title: row.title,
          article_url: row.article_url,
          provider: row.provider ?? "unknown",
          reason: error.message,
          payload: row,
        });
      }
      continue;
    }

    const batchInserted = data?.length ?? 0;
    inserted += batchInserted;
    skippedDuplicates += batch.length - batchInserted;
  }

  const durationMs = Date.now() - startedAt;
  const status =
    inserted > 0 ? "success" : articles.length > 0 ? "partial" : "empty";

  const { data: logRow } = await supabase
    .from("ingestion_logs")
    .insert({
      status,
      total_fetched: articles.length,
      total_valid: validRows.length,
      inserted,
      skipped_duplicates: skippedDuplicates,
      failed_validation: failures.length,
      category_stats: categoryStats,
      provider_stats: providerStats,
      provider_errors: meta.errors,
      duration_ms: meta.fetchDurationMs + durationMs,
      metadata: {
        providers: meta.providers,
        rss_source_analytics: meta.rssAnalytics ?? [],
        rss_healthy_sources: meta.healthySources ?? [],
        rss_failed_sources: meta.failedSources ?? [],
        articles_recovered_by_fallback: meta.articlesRecoveredByFallback ?? 0,
        image_analytics: meta.imageAnalytics ?? null,
      },
    })
    .select("id")
    .single();

  return {
    inserted,
    skippedDuplicates,
    failedValidation: failures.length,
    totalFetched: articles.length,
    aiProcessed: 0,
    durationMs: meta.fetchDurationMs + durationMs,
    categoryStats,
    providerStats,
    failures: failures.slice(0, 50),
    logId: logRow?.id ?? null,
  };
}
