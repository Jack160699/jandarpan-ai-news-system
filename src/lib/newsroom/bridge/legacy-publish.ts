/**
 * Legacy bridge — sync validated articles → news_articles for current homepage
 * Disable with NEWSROOM_LEGACY_BRIDGE=false when homepage reads generated_articles only
 */

import { createAdminServerClient } from "@/lib/supabase";
import { enqueueArticlesForAi, isAiQueueEnabled } from "@/lib/news/ai/queue";
import { titleHash, urlHash, canonicalArticleUrl } from "@/lib/news/normalize";
import { assignSlugsToRows } from "@/lib/news/slug";
import { logNewsroom, logNewsroomError } from "@/lib/newsroom/logger";
import type { NormalizedArticle } from "@/lib/news/types";
import type { NewsArticleId, NewsArticleInsert } from "@/lib/types/news-article";
import {
  formatSupabaseError,
  logIngestTrace,
  summarizeInsertRows,
} from "@/lib/news/pipeline/ingest-trace";
import { dedupeRowsByConflictKey } from "@/lib/news/pipeline/batch-dedupe";

const BATCH_SIZE = 40;

export type LegacyPublishResult = {
  inserted: number;
  skippedDuplicates: number;
  articleIds: NewsArticleId[];
  queuedForAI: number;
};

export function isLegacyBridgeEnabled(): boolean {
  const flag = process.env.NEWSROOM_LEGACY_BRIDGE?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

function toLegacyRow(
  article: NormalizedArticle & { slug?: string }
): NewsArticleInsert {
  return {
    title: article.title,
    description: article.description,
    content: article.content,
    image_url: article.image_url,
    source: article.source ?? article.provider ?? null,
    author: article.author,
    category: article.category,
    article_url: article.article_url,
    published_at: article.published_at,
    language: article.language,
    region: article.region,
    title_hash: titleHash(article.title),
    url_hash: urlHash(article.article_url),
    slug: article.slug,
  };
}

export async function publishToLegacyArticles(
  articles: NormalizedArticle[]
): Promise<LegacyPublishResult> {
  const result: LegacyPublishResult = {
    inserted: 0,
    skippedDuplicates: 0,
    articleIds: [],
    queuedForAI: 0,
  };

  if (!isLegacyBridgeEnabled() || !articles.length) {
    logNewsroom("bridge", "legacy_bridge_skipped", {
      enabled: isLegacyBridgeEnabled(),
      count: articles.length,
    });
    return result;
  }

  const slugged = assignSlugsToRows(
    articles.map((a) => ({ title: a.title, article_url: a.article_url }))
  );

  const rows = articles.map((article, i) =>
    toLegacyRow({
      ...article,
      article_url: canonicalArticleUrl(article.article_url),
      slug: slugged[i].slug,
    })
  );

  const preBatchDedupe = dedupeRowsByConflictKey(
    rows as Record<string, unknown>[],
    {
      key: "article_url",
      canonicalize: canonicalArticleUrl,
    }
  );
  const dedupedRows = preBatchDedupe.rows as NewsArticleInsert[];

  if (preBatchDedupe.duplicateCount > 0) {
    logIngestTrace("legacy_batch_deduped", {
      conflictKey: preBatchDedupe.conflictKey,
      duplicateCount: preBatchDedupe.duplicateCount,
      inputRows: rows.length,
      outputRows: dedupedRows.length,
      sampleDuplicateKeys: preBatchDedupe.duplicateKeys,
    });
    logNewsroom("bridge", "legacy_batch_deduped", {
      duplicateCount: preBatchDedupe.duplicateCount,
      inputRows: rows.length,
      outputRows: dedupedRows.length,
    });
    result.skippedDuplicates += preBatchDedupe.duplicateCount;
  }

  const supabase = createAdminServerClient();

  logIngestTrace("legacy_publish_start", {
    rowCount: dedupedRows.length,
    legacyBridgeEnabled: true,
    samplePayload: summarizeInsertRows(dedupedRows as Record<string, unknown>[]),
  });

  for (let i = 0; i < dedupedRows.length; i += BATCH_SIZE) {
    const rawBatch = dedupedRows.slice(i, i + BATCH_SIZE);
    const batchIndex = Math.floor(i / BATCH_SIZE);

    const batchDedupe = dedupeRowsByConflictKey(
      rawBatch as Record<string, unknown>[],
      {
        key: "article_url",
        canonicalize: canonicalArticleUrl,
      }
    );
    const batch = batchDedupe.rows as NewsArticleInsert[];

    if (batchDedupe.duplicateCount > 0) {
      logIngestTrace("legacy_upsert_batch_deduped", {
        batchIndex,
        duplicateCount: batchDedupe.duplicateCount,
        inputRows: rawBatch.length,
        outputRows: batch.length,
        sampleDuplicateKeys: batchDedupe.duplicateKeys,
      });
    }

    logIngestTrace("legacy_upsert_attempt", {
      batchIndex,
      batchSize: batch.length,
      onConflict: "article_url",
      ignoreDuplicates: false,
      samplePayload: summarizeInsertRows(batch as Record<string, unknown>[]),
    });

    const { data, error } = await supabase
      .from("news_articles")
      .upsert(batch, {
        onConflict: "article_url",
        // Refresh existing wire rows (published_at, title, images) — do not freeze on old URLs
        ignoreDuplicates: false,
      })
      .select("id");

    if (error) {
      logIngestTrace("legacy_upsert_error", {
        batchIndex,
        batchSize: batch.length,
        error: formatSupabaseError(error),
        samplePayload: summarizeInsertRows(batch as Record<string, unknown>[]),
        firstFailure: true,
      });
      logNewsroomError("bridge", "legacy_upsert_failed", error, {
        batchSize: batch.length,
      });
      continue;
    }

    const batchUpserted = data?.length ?? 0;
    logIngestTrace("legacy_upsert_ok", {
      batchIndex,
      batchSize: batch.length,
      returnedRows: batchUpserted,
      skippedDuplicates: Math.max(0, batch.length - batchUpserted),
    });
    result.inserted += batchUpserted;
    // Rows returned from upsert — treat remainder as unchanged conflicts (rare)
    result.skippedDuplicates += Math.max(0, batch.length - batchUpserted);
    for (const row of data ?? []) {
      if (row.id != null) result.articleIds.push(row.id);
    }
  }

  if (isAiQueueEnabled() && result.articleIds.length) {
    result.queuedForAI = await enqueueArticlesForAi(result.articleIds);
  }

  logNewsroom("bridge", "legacy_publish_complete", {
    inserted: result.inserted,
    skippedDuplicates: result.skippedDuplicates,
    queuedForAI: result.queuedForAI,
  });

  return result;
}
