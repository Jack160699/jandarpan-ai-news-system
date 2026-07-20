/**
 * Persist raw provider output → news_signals (never public)
 */

import { createAdminServerClient } from "@/lib/supabase";
import { tagGeoFromContent } from "@/lib/regional/geo-tagging";
import { canonicalArticleUrl } from "@/lib/news/normalize";
import { logNewsroom, logNewsroomError } from "@/lib/newsroom/logger";
import type { NormalizedArticle } from "@/lib/news/types";
import { getPipelineTenantId } from "@/lib/tenant/pipeline";
import type { NewsSignalInsert } from "@/lib/types/newsroom";
import { asJson, asJsonObject, type JsonObject } from "@/types/json";
import {
  formatSupabaseError,
  logIngestTrace,
  summarizeInsertRows,
} from "@/lib/news/pipeline/ingest-trace";
import { dedupeRowsByConflictKey } from "@/lib/news/pipeline/batch-dedupe";

const BATCH_SIZE = 40;

export type SignalPersistResult = {
  inserted: number;
  skippedDuplicates: number;
  signalIds: string[];
};

export function normalizedToSignal(
  article: NormalizedArticle,
  meta?: JsonObject
): NewsSignalInsert {
  const rawContent = [article.description, article.content]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const geo = tagGeoFromContent({
    title: article.title,
    body: rawContent,
    region: article.region,
    category: article.category,
  });

  return {
    tenant_id: getPipelineTenantId(),
    source: article.source,
    provider: article.provider,
    title: article.title,
    raw_content: rawContent || article.title,
    article_url: article.article_url,
    image_url: article.image_url,
    published_at: article.published_at,
    category: article.category,
    region: geo.is_chhattisgarh ? "chhattisgarh" : article.region,
    language: article.language,
    // Column + ingestion_metadata.geo (migration 014)
    geo_metadata: geo,
    ingestion_metadata: asJsonObject({
      author: article.author,
      title_hash: meta?.title_hash,
      url_hash: meta?.url_hash,
      slug: meta?.slug,
      geo,
      ...(meta ?? {}),
    }),
  };
}

export async function persistNewsSignals(
  articles: NormalizedArticle[],
  provider: string,
  meta?: Record<string, unknown>
): Promise<SignalPersistResult> {
  const result: SignalPersistResult = {
    inserted: 0,
    skippedDuplicates: 0,
    signalIds: [],
  };

  if (!articles.length) return result;

  const supabase = createAdminServerClient();
  const rows = articles.map((a) =>
    normalizedToSignal(
      { ...a, article_url: canonicalArticleUrl(a.article_url) },
      { ...meta, provider }
    )
  );

  const preBatchDedupe = dedupeRowsByConflictKey(
    rows as Record<string, unknown>[],
    {
      key: "article_url",
      canonicalize: canonicalArticleUrl,
    }
  );
  const dedupedRows = preBatchDedupe.rows as NewsSignalInsert[];

  if (preBatchDedupe.duplicateCount > 0) {
    logIngestTrace("signals_batch_deduped", {
      provider,
      conflictKey: preBatchDedupe.conflictKey,
      duplicateCount: preBatchDedupe.duplicateCount,
      inputRows: rows.length,
      outputRows: dedupedRows.length,
      sampleDuplicateKeys: preBatchDedupe.duplicateKeys,
    });
    result.skippedDuplicates += preBatchDedupe.duplicateCount;
  }

  logIngestTrace("signals_persist_start", {
    provider,
    rowCount: dedupedRows.length,
    tenantId: dedupedRows[0]?.tenant_id ?? null,
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
    const batch = batchDedupe.rows as NewsSignalInsert[];

    if (batchDedupe.duplicateCount > 0) {
      logIngestTrace("signals_upsert_batch_deduped", {
        provider,
        batchIndex,
        duplicateCount: batchDedupe.duplicateCount,
        inputRows: rawBatch.length,
        outputRows: batch.length,
        sampleDuplicateKeys: batchDedupe.duplicateKeys,
      });
      result.skippedDuplicates += batchDedupe.duplicateCount;
    }

    logIngestTrace("signals_upsert_attempt", {
      provider,
      batchIndex,
      batchSize: batch.length,
      onConflict: "article_url",
      ignoreDuplicates: true,
      samplePayload: summarizeInsertRows(batch as Record<string, unknown>[]),
    });

    const { data, error } = await supabase
      .from("news_signals")
      .upsert(batch, {
        onConflict: "article_url",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      logIngestTrace("signals_upsert_error", {
        provider,
        batchIndex,
        batchSize: batch.length,
        error: formatSupabaseError(error),
        samplePayload: summarizeInsertRows(batch as Record<string, unknown>[]),
        firstFailure: true,
      });
      logNewsroomError("signals", "upsert_batch_failed", error, {
        provider,
        batchSize: batch.length,
      });
      continue;
    }

    const batchInserted = data?.length ?? 0;
    if (batchInserted === 0 && batch.length > 0) {
      logIngestTrace("signals_upsert_zero_rows", {
        provider,
        batchIndex,
        batchSize: batch.length,
        reason: "all_duplicates_or_ignored",
        sampleUrls: batch.slice(0, 3).map((r) => r.article_url),
      });
    } else {
      logIngestTrace("signals_upsert_ok", {
        provider,
        batchIndex,
        batchSize: batch.length,
        returnedRows: batchInserted,
        skippedDuplicates: batch.length - batchInserted,
      });
    }
    result.inserted += batchInserted;
    result.skippedDuplicates += batch.length - batchInserted;
    for (const row of data ?? []) {
      if (row.id) result.signalIds.push(String(row.id));
    }
  }

  logNewsroom("signals", "persist_complete", {
    provider,
    inserted: result.inserted,
    skippedDuplicates: result.skippedDuplicates,
    total: articles.length,
  });

  return result;
}
