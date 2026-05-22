/**
 * Incremental provider ingest — sanitize, validate, images, slug, upsert, AI queue
 */

import { createAdminClient } from "@/lib/supabase";
import { enqueueArticlesForAi, isAiQueueEnabled } from "@/lib/news/ai/queue";
import { enrichArticleImages } from "@/lib/news/images/enrich";
import type { ImageEnrichmentAnalytics } from "@/lib/news/images/enrich";
import { titleHash, urlHash } from "@/lib/news/normalize";
import {
  mergeValidationStats,
  sanitizeNewsArticle,
  validateArticlesForIngest,
  type ArticleValidationStats,
} from "@/lib/news/sanitize-article";
import { assignSlugsToRows } from "@/lib/news/slug";
import { revalidateLiveHomepage } from "@/lib/news/revalidate-home";
import type { NormalizedArticle, NewsProviderId } from "@/lib/news/types";
import type { NewsArticleInsert } from "@/lib/types/news-article";

const UPSERT_BATCH = 40;

export type ProviderIngestResult = {
  provider: NewsProviderId;
  inserted: number;
  skippedDuplicates: number;
  failedValidation: number;
  queuedForAI: number;
  totalFetched: number;
  categoryStats: Record<string, number>;
  failures: Array<{ title: string; reason: string; provider: string }>;
  imageAnalytics: ImageEnrichmentAnalytics | null;
  validationStats: ArticleValidationStats;
};

function toInsertRow(
  article: NormalizedArticle & { slug?: string }
): NewsArticleInsert {
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

/** Core columns for DBs without extended migration columns */
function toCoreInsertRow(
  article: NormalizedArticle & { slug?: string }
): NewsArticleInsert {
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
    slug: article.slug,
  };
}

async function upsertBatch(
  supabase: ReturnType<typeof createAdminClient>,
  rows: NewsArticleInsert[],
  provider: NewsProviderId
): Promise<{ inserted: number; skippedDuplicates: number; ids: string[] }> {
  let inserted = 0;
  let skippedDuplicates = 0;
  const ids: string[] = [];

  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH);
    let { data, error } = await supabase
      .from("news_articles")
      .upsert(batch, {
        onConflict: "article_url",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error?.message?.includes("column")) {
      const coreBatch = batch.map((row) =>
        toCoreInsertRow(row as NormalizedArticle & { slug?: string })
      );
      const retry = await supabase
        .from("news_articles")
        .upsert(coreBatch, {
          onConflict: "article_url",
          ignoreDuplicates: true,
        })
        .select("id");
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error(`[ingest:${provider}] upsert:`, error.message);
      continue;
    }

    const batchInserted = data?.length ?? 0;
    inserted += batchInserted;
    skippedDuplicates += batch.length - batchInserted;
    for (const row of data ?? []) {
      const id = row.id;
      if (id != null) ids.push(String(id));
    }
  }

  return { inserted, skippedDuplicates, ids };
}

export async function ingestProviderArticles(
  rawArticles: NormalizedArticle[],
  provider: NewsProviderId,
  options?: {
    maxImagePageFetches?: number;
    revalidateHome?: boolean;
  }
): Promise<ProviderIngestResult> {
  const result: ProviderIngestResult = {
    provider,
    inserted: 0,
    skippedDuplicates: 0,
    failedValidation: 0,
    queuedForAI: 0,
    totalFetched: rawArticles.length,
    categoryStats: {},
    failures: [],
    imageAnalytics: null,
    validationStats: {
      total: 0,
      sanitized: 0,
      softFixed: 0,
      rejected: 0,
      reasons: {},
    },
  };

  if (!rawArticles.length) return result;

  const preSanitized = rawArticles.map((a) => sanitizeNewsArticle(a).article);
  const { valid, stats, failures } = validateArticlesForIngest(
    preSanitized,
    provider
  );
  result.validationStats = stats;
  result.failedValidation = failures.length;
  result.failures = failures;

  if (!valid.length) {
    console.warn(`[ingest:${provider}] All ${rawArticles.length} articles rejected`, {
      validationStats: stats,
      sampleFailures: failures.slice(0, 5),
    });
    return result;
  }

  const { articles: enriched, analytics } = await enrichArticleImages(valid, {
    maxPageFetches: options?.maxImagePageFetches ?? 12,
  });
  result.imageAnalytics = analytics;

  const postEnrich: NormalizedArticle[] = [];
  for (const article of enriched) {
    const { article: sanitized } = sanitizeNewsArticle(article);
    postEnrich.push(sanitized);
  }

  const slugged = assignSlugsToRows(
    postEnrich.map((a) => ({ title: a.title, article_url: a.article_url }))
  );

  const rows: NewsArticleInsert[] = postEnrich.map((article, i) =>
    toInsertRow({ ...article, slug: slugged[i].slug })
  );

  const supabase = createAdminClient();
  const { inserted, skippedDuplicates, ids } = await upsertBatch(
    supabase,
    rows,
    provider
  );

  result.inserted = inserted;
  result.skippedDuplicates = skippedDuplicates;

  for (const article of postEnrich) {
    result.categoryStats[article.category] =
      (result.categoryStats[article.category] ?? 0) + 1;
  }

  if (isAiQueueEnabled() && ids.length) {
    result.queuedForAI = await enqueueArticlesForAi(ids);
  }

  if (result.inserted > 0 && options?.revalidateHome !== false) {
    revalidateLiveHomepage();
  }

  console.log(
    `[ingest:${provider}] inserted=${result.inserted} valid=${postEnrich.length} rejected=${result.failedValidation} queuedAI=${result.queuedForAI}`
  );

  return result;
}

export { mergeValidationStats };
