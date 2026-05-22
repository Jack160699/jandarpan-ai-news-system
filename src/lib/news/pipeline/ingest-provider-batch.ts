/**
 * Incremental provider ingest — validate, images, slug, upsert, AI queue
 */

import { createAdminClient } from "@/lib/supabase";
import { enqueueArticlesForAi, isAiQueueEnabled } from "@/lib/news/ai/queue";
import { enrichArticleImages } from "@/lib/news/images/enrich";
import type { ImageEnrichmentAnalytics } from "@/lib/news/images/enrich";
import { titleHash, urlHash, validateArticle } from "@/lib/news/normalize";
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
  };

  if (!rawArticles.length) return result;

  const { articles: enriched, analytics } = await enrichArticleImages(
    rawArticles,
    { maxPageFetches: options?.maxImagePageFetches ?? 12 }
  );
  result.imageAnalytics = analytics;

  const validated: NormalizedArticle[] = [];
  for (const article of enriched) {
    const check = validateArticle(article, {
      strictRss: article.provider === "rss",
    });
    if (!check.valid) {
      result.failedValidation++;
      result.failures.push({
        title: article.title?.slice(0, 120) ?? "unknown",
        reason: check.reason ?? "invalid",
        provider: article.provider,
      });
      continue;
    }
    validated.push(article);
    result.categoryStats[article.category] =
      (result.categoryStats[article.category] ?? 0) + 1;
  }

  if (!validated.length) return result;

  const slugged = assignSlugsToRows(
    validated.map((a) => ({ title: a.title, article_url: a.article_url }))
  );

  const rows: NewsArticleInsert[] = validated.map((article, i) =>
    toInsertRow({ ...article, slug: slugged[i].slug })
  );

  const supabase = createAdminClient();
  const insertedIds: string[] = [];

  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH);
    const { data, error } = await supabase
      .from("news_articles")
      .upsert(batch, {
        onConflict: "article_url",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      console.error(`[ingest:${provider}] upsert:`, error.message);
      continue;
    }

    const batchInserted = data?.length ?? 0;
    result.inserted += batchInserted;
    result.skippedDuplicates += batch.length - batchInserted;
    for (const row of data ?? []) {
      if (row.id) insertedIds.push(row.id);
    }
  }

  if (isAiQueueEnabled() && insertedIds.length) {
    result.queuedForAI = await enqueueArticlesForAi(insertedIds);
  }

  if (result.inserted > 0 && options?.revalidateHome !== false) {
    revalidateLiveHomepage();
  }

  console.log(
    `[ingest:${provider}] inserted=${result.inserted} queuedAI=${result.queuedForAI} skipped=${result.skippedDuplicates}`
  );

  return result;
}
