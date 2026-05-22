/**
 * Persist raw provider output → news_signals (never public)
 */

import { createAdminServerClient } from "@/lib/supabase";
import { logNewsroom, logNewsroomError } from "@/lib/newsroom/logger";
import type { NormalizedArticle } from "@/lib/news/types";
import type { NewsSignalInsert } from "@/lib/types/newsroom";

const BATCH_SIZE = 40;

export type SignalPersistResult = {
  inserted: number;
  skippedDuplicates: number;
  signalIds: string[];
};

export function normalizedToSignal(
  article: NormalizedArticle,
  meta?: Record<string, unknown>
): NewsSignalInsert {
  const rawContent = [article.description, article.content]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return {
    source: article.source,
    provider: article.provider,
    title: article.title,
    raw_content: rawContent || article.title,
    article_url: article.article_url,
    image_url: article.image_url,
    published_at: article.published_at,
    category: article.category,
    region: article.region,
    language: article.language,
    ingestion_metadata: {
      author: article.author,
      title_hash: meta?.title_hash,
      url_hash: meta?.url_hash,
      slug: meta?.slug,
      ...meta,
    },
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
  const rows = articles.map((a) => normalizedToSignal(a, { ...meta, provider }));

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase
      .from("news_signals")
      .upsert(batch, {
        onConflict: "article_url",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      logNewsroomError("signals", "upsert_batch_failed", error, {
        provider,
        batchSize: batch.length,
      });
      continue;
    }

    const batchInserted = data?.length ?? 0;
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
