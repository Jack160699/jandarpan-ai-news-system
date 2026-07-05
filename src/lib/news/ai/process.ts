/**

 * AI enrichment — summaries, short headlines, category cleanup

 * Cloud LLM when configured; deterministic local fallback on auth/upstream failure.

 */



import {

  enrichArticleLocally,

  isAnyChatProviderConfigured,

  isLocalEnrichEnabled,

  recordProviderFallback,

  requestChatCompletion,

} from "@/lib/ai/providers";

import { createAdminClient } from "@/lib/supabase";

import {
  claimAiQueueBatch,
  releaseAiQueueItems,
} from "@/lib/news/ai/queue";
import {
  markAiQueueOutcome,
  promoteRetryReadyAiQueueItems,
} from "@/lib/news/ai/ai-queue-retry";
import { recordQueueFailure } from "@/lib/infrastructure/queue/failure-record";
import type { ExecutionDeadline } from "@/lib/serverless/deadline";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";

import type { NewsArticleRow } from "@/lib/types/news-article";



const BATCH_LIMIT = 8;



export type AiProcessResult = {
  processed: number;
  skipped: number;
  errors: string[];
  localFallback: number;
  cloudSuccess: number;
  partial?: boolean;
  released?: number;
  batchCount?: number;
};

export type AiProcessOptions = {
  deadline?: ExecutionDeadline;
  microBatchSize?: number;
};



function isAiEnabled(): boolean {

  return isAnyChatProviderConfigured() || isLocalEnrichEnabled();

}



type EnrichOutput = {

  ai_summary: string | null;

  ai_headline: string | null;

  category: string;

  via: "cloud" | "local";

};



async function enrichArticle(article: NewsArticleRow): Promise<EnrichOutput | null> {

  const system = `You are a bilingual (Hindi + English) news editor for a Chhattisgarh newspaper.

Return JSON only: {"summary":"2-3 sentence summary","headline":"max 12 words","category":"one of: business, technology, sports, entertainment, health, politics, world, local"}`;



  const user = `Title: ${article.title}\nDescription: ${article.description ?? ""}\nSource category: ${article.category}\nLanguage hint: ${article.language ?? "en"}`;



  if (isAnyChatProviderConfigured()) {

    const result = await requestChatCompletion({

      operation: "ai_enrich",

      system,

      user,

      temperature: 0.3,

      maxTokens: 400,

      jsonMode: true,

      timeoutMs: 8_000,

    });



    if (result.ok) {

      try {

        const parsed = JSON.parse(result.content) as {

          summary?: string;

          headline?: string;

          category?: string;

        };

        return {

          ai_summary: parsed.summary?.trim() ?? null,

          ai_headline: parsed.headline?.trim() ?? null,

          category: parsed.category?.trim() || article.category,

          via: "cloud",

        };

      } catch {

        /* fall through to local */

      }

    } else if (isLocalEnrichEnabled()) {

      recordProviderFallback(result.provider, "local", result.error.code);

    } else {

      throw new Error(result.error.message);

    }

  }



  if (!isLocalEnrichEnabled()) return null;



  const local = enrichArticleLocally(article);

  return {

    ai_summary: local.ai_summary,

    ai_headline: local.ai_headline,

    category: local.category,

    via: "local",

  };

}



/**

 * Process recent articles missing AI fields (post-ingestion).

 */

export async function processRecentArticlesWithAi(

  limit = BATCH_LIMIT

): Promise<AiProcessResult> {

  if (!isAiEnabled()) {

    console.log("[ai] No AI providers and local enrich disabled — skipping");

    return { processed: 0, skipped: 0, errors: [], localFallback: 0, cloudSuccess: 0 };

  }



  const supabase = createAdminClient();

  const { data: rows, error } = await supabase

    .from("news_articles")

    .select("*")

    .is("ai_summary", null)

    .order("created_at", { ascending: false })

    .limit(limit);



  if (error || !rows?.length) {

    return {

      processed: 0,

      skipped: 0,

      errors: error ? [error.message] : [],

      localFallback: 0,

      cloudSuccess: 0,

    };

  }



  let processed = 0;

  let localFallback = 0;

  let cloudSuccess = 0;

  const errors: string[] = [];



  for (const row of rows) {

    const article = row as NewsArticleRow;

    try {

      const enriched = await enrichArticle(article);

      if (!enriched) continue;



      const { error: updateError } = await supabase

        .from("news_articles")

        .update({

          ai_summary: enriched.ai_summary,

          ai_headline: enriched.ai_headline,

          category: enriched.category,

          ai_processed_at: new Date().toISOString(),

        })

        .eq("id", article.id);



      if (updateError) {

        errors.push(updateError.message);

      } else {

        processed++;

        if (enriched.via === "local") localFallback++;

        else cloudSuccess++;

      }

    } catch (err) {

      const msg = err instanceof Error ? err.message : "AI enrich failed";

      errors.push(`${article.id}: ${msg}`);

      console.error("[ai]", msg);

    }

  }



  return {

    processed,

    skipped: rows.length - processed,

    errors,

    localFallback,

    cloudSuccess,

  };

}



/** Process articles from news_ai_queue with deadline-aware micro-batching */
export async function processAiQueueBatch(
  limit = 10,
  options?: AiProcessOptions
): Promise<AiProcessResult> {
  if (!isAiEnabled()) {
    return {
      processed: 0,
      skipped: 0,
      errors: [],
      localFallback: 0,
      cloudSuccess: 0,
    };
  }

  const deadline = options?.deadline;
  const microBatch = options?.microBatchSize ?? INFRA_CONFIG.aiQueueMicroBatch;
  const reserveMs = INFRA_CONFIG.workerDeadlineReserveMs;

  await promoteRetryReadyAiQueueItems().catch((err) => {
    console.error("[ai-queue] promote retries:", err instanceof Error ? err.message : err);
  });

  let totalProcessed = 0;
  let totalSkipped = 0;
  let localFallback = 0;
  let cloudSuccess = 0;
  const errors: string[] = [];
  let released = 0;
  let batchCount = 0;
  let partial = false;
  let remaining = limit;

  while (remaining > 0) {
    if (deadline?.shouldStop()) {
      partial = true;
      break;
    }
    if (deadline && !deadline.hasBudgetFor(reserveMs)) {
      partial = true;
      break;
    }

    const claimSize = Math.min(microBatch, remaining);
    const articleIds = await claimAiQueueBatch(claimSize);
    batchCount++;

    if (!articleIds.length) break;

    const supabase = createAdminClient();
    const { data: rows, error } = await supabase
      .from("news_articles")
      .select("*")
      .in("id", articleIds);

    if (error || !rows?.length) {
      await releaseAiQueueItems(articleIds);
      errors.push(...(error ? [error.message] : []));
      break;
    }

    const pendingIds = new Set(articleIds);
    let batchProcessed = 0;

    await Promise.allSettled(
      rows.map(async (row) => {
        const article = row as NewsArticleRow;
        try {
          const enriched = await enrichArticle(article);
          if (!enriched) {
            await markAiQueueOutcome(article.id, false, "no_enrichment", { retryable: false });
            pendingIds.delete(article.id);
            return;
          }

          const { error: updateError } = await supabase
            .from("news_articles")
            .update({
              ai_summary: enriched.ai_summary,
              ai_headline: enriched.ai_headline,
              category: enriched.category,
              ai_processed_at: new Date().toISOString(),
            })
            .eq("id", article.id);

          if (updateError) {
            errors.push(updateError.message);
            await markAiQueueOutcome(article.id, false, updateError.message, {
              retryable: true,
            });
            await recordQueueFailure({
              worker: "ai_enrich",
              articleId: article.id,
              error: updateError.message,
              category: "database",
              retryCount: 0,
              terminal: false,
            });
          } else {
            batchProcessed++;
            if (enriched.via === "local") localFallback++;
            else cloudSuccess++;
            await markAiQueueOutcome(article.id, true);
          }
          pendingIds.delete(article.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "AI enrich failed";
          errors.push(`${article.id}: ${msg}`);
          await markAiQueueOutcome(article.id, false, msg, { retryable: true });
          await recordQueueFailure({
            worker: "ai_enrich",
            articleId: article.id,
            error: msg,
            retryCount: 0,
            terminal: false,
          });
          pendingIds.delete(article.id);
        }
      })
    );

    totalProcessed += batchProcessed;
    totalSkipped += rows.length - batchProcessed;
    remaining -= articleIds.length;

    if (deadline?.shouldStop() || (deadline && !deadline.hasBudgetFor(reserveMs))) {
      if (pendingIds.size > 0) {
        released += await releaseAiQueueItems([...pendingIds]);
        partial = true;
      }
      break;
    }
  }

  console.log(
    JSON.stringify({
      tag: "[ai-pipeline]",
      phase: "batch_complete",
      processed: totalProcessed,
      localFallback,
      cloudSuccess,
      errorCount: errors.length,
      partial,
      released,
      batchCount,
      ts: new Date().toISOString(),
    })
  );

  return {
    processed: totalProcessed,
    skipped: totalSkipped,
    errors,
    localFallback,
    cloudSuccess,
    partial,
    released,
    batchCount,
  };
}

