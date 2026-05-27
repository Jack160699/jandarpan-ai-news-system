/**
 * AI enrichment — summaries, short headlines, category cleanup
 * Optional: requires OPENAI_API_KEY (skipped when unset — free-tier friendly)
 */

import { createAdminClient } from "@/lib/supabase";
import {
  claimAiQueueBatch,
  markAiQueueCompleted,
} from "@/lib/news/ai/queue";
import type { NewsArticleRow } from "@/lib/types/news-article";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const BATCH_LIMIT = 8;
const AI_FETCH_TIMEOUT_MS = 8_000;

export type AiProcessResult = {
  processed: number;
  skipped: number;
  errors: string[];
};

function isAiEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

async function enrichArticle(article: NewsArticleRow): Promise<{
  ai_summary: string | null;
  ai_headline: string | null;
  category: string;
} | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const body = {
    model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    temperature: 0.3,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: `You are a bilingual (Hindi + English) news editor for a Chhattisgarh newspaper.
Return JSON only: {"summary":"2-3 sentence summary","headline":"max 12 words","category":"one of: business, technology, sports, entertainment, health, politics, world, local"}`,
      },
      {
        role: "user",
        content: `Title: ${article.title}\nDescription: ${article.description ?? ""}\nSource category: ${article.category}\nLanguage hint: ${article.language ?? "en"}`,
      },
    ],
    response_format: { type: "json_object" as const },
  };

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(AI_FETCH_TIMEOUT_MS),
  });

  if (!res.ok) {
    throw new Error(`OpenAI HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = json.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = JSON.parse(content) as {
    summary?: string;
    headline?: string;
    category?: string;
  };

  return {
    ai_summary: parsed.summary?.trim() ?? null,
    ai_headline: parsed.headline?.trim() ?? null,
    category: parsed.category?.trim() || article.category,
  };
}

/**
 * Process recent articles missing AI fields (post-ingestion).
 */
export async function processRecentArticlesWithAi(
  limit = BATCH_LIMIT
): Promise<AiProcessResult> {
  if (!isAiEnabled()) {
    console.log("[ai] OPENAI_API_KEY not set — skipping enrichment");
    return { processed: 0, skipped: 0, errors: [] };
  }

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("news_articles")
    .select("*")
    .is("ai_summary", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !rows?.length) {
    return { processed: 0, skipped: 0, errors: error ? [error.message] : [] };
  }

  let processed = 0;
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
  };
}

/** Process articles from news_ai_queue (used by /api/process-ai) */
export async function processAiQueueBatch(
  limit = 10
): Promise<AiProcessResult> {
  if (!isAiEnabled()) {
    return { processed: 0, skipped: 0, errors: [] };
  }

  const articleIds = await claimAiQueueBatch(limit);
  if (!articleIds.length) {
    return { processed: 0, skipped: 0, errors: [] };
  }

  const supabase = createAdminClient();
  const { data: rows, error } = await supabase
    .from("news_articles")
    .select("*")
    .in("id", articleIds);

  if (error || !rows?.length) {
    return {
      processed: 0,
      skipped: 0,
      errors: error ? [error.message] : [],
    };
  }

  let processed = 0;
  const errors: string[] = [];

  await Promise.allSettled(
    rows.map(async (row) => {
      const article = row as NewsArticleRow;
      try {
        const enriched = await enrichArticle(article);
        if (!enriched) {
          await markAiQueueCompleted(article.id, false, "no_enrichment");
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
          await markAiQueueCompleted(article.id, false, updateError.message);
        } else {
          processed++;
          await markAiQueueCompleted(article.id, true);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI enrich failed";
        errors.push(`${article.id}: ${msg}`);
        await markAiQueueCompleted(article.id, false, msg);
      }
    })
  );

  return {
    processed,
    skipped: rows.length - processed,
    errors,
  };
}
