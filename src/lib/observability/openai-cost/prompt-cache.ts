/**
 * Prompt result cache — skip duplicate OpenAI calls for identical prompts
 */

import { createAdminServerClient } from "@/lib/supabase";
import { asJsonObject } from "@/types/json";
import { hashPrompt } from "@/lib/observability/openai-cost/token-estimate";
import { logOpenAiUsage, buildUsageRecord } from "@/lib/observability/openai-cost/record";

export const PROMPT_CACHE_VERSION =
  process.env.OPENAI_PROMPT_CACHE_VERSION?.trim() || "1";

const DEFAULT_TTL_DAYS = Number(process.env.OPENAI_PROMPT_CACHE_TTL_DAYS) || 7;

export type PromptCacheLookup = {
  hit: boolean;
  result?: string;
  savedCostUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
};

type CacheRow = {
  result_json: unknown;
  estimated_cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  model: string;
};

export function computePromptCacheKey(input: {
  system?: string;
  user: string;
  operation: string;
  worker: string;
  articleId?: string;
  eventId?: string;
}): string {
  const text = [input.system, input.user].filter(Boolean).join("\n");
  return `${hashPrompt(text)}:${input.operation}:${input.worker}:${PROMPT_CACHE_VERSION}:${input.articleId ?? ""}:${input.eventId ?? ""}`;
}

export async function lookupPromptCache(input: {
  system?: string;
  user: string;
  operation: string;
  worker: string;
  articleId?: string;
  eventId?: string;
}): Promise<PromptCacheLookup> {
  if (process.env.OPENAI_PROMPT_CACHE_ENABLED === "false") {
    return { hit: false };
  }

  try {
    const supabase = createAdminServerClient();
    const promptHash = hashPrompt([input.system, input.user].filter(Boolean).join("\n"));

    let query = supabase
      .from("openai_prompt_cache")
      .select("result_json, estimated_cost_usd, input_tokens, output_tokens, model")
      .eq("prompt_hash", promptHash)
      .eq("operation", input.operation)
      .eq("worker", input.worker)
      .eq("cache_version", PROMPT_CACHE_VERSION)
      .gt("expires_at", new Date().toISOString());

    if (input.articleId) {
      query = query.eq("article_id", input.articleId);
    } else {
      query = query.is("article_id", null);
    }
    if (input.eventId) {
      query = query.eq("event_id", input.eventId);
    } else {
      query = query.is("event_id", null);
    }

    const { data } = await query.maybeSingle();

    if (!data) return { hit: false };

    const row = data as CacheRow;
    const result =
      typeof row.result_json === "string"
        ? row.result_json
        : JSON.stringify(row.result_json);

    const savedCost = Number(row.estimated_cost_usd);

    logOpenAiUsage(
      buildUsageRecord({
        operation: input.operation,
        endpoint: "chat.completions",
        model: row.model,
        inputTokens: 0,
        outputTokens: 0,
        success: true,
        system: input.system,
        user: input.user,
        context: {
          worker: input.worker,
          articleId: input.articleId,
          eventId: input.eventId,
        },
        metadata: {
          cacheHit: true,
          savedCostUsd: savedCost,
          cachedInputTokens: row.input_tokens,
          cachedOutputTokens: row.output_tokens,
        },
      })
    );

    return {
      hit: true,
      result,
      savedCostUsd: savedCost,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
    };
  } catch {
    return { hit: false };
  }
}

export async function storePromptCache(input: {
  system?: string;
  user: string;
  operation: string;
  worker: string;
  articleId?: string;
  eventId?: string;
  model: string;
  result: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}): Promise<void> {
  if (process.env.OPENAI_PROMPT_CACHE_ENABLED === "false") return;

  try {
    const supabase = createAdminServerClient();
    const promptHash = hashPrompt([input.system, input.user].filter(Boolean).join("\n"));
    const expiresAt = new Date(
      Date.now() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    await supabase.from("openai_prompt_cache").upsert(
      {
        prompt_hash: promptHash,
        operation: input.operation,
        worker: input.worker,
        cache_version: PROMPT_CACHE_VERSION,
        article_id: input.articleId ?? null,
        event_id: input.eventId ?? null,
        model: input.model,
        result_json: asJsonObject({ content: input.result }),
        input_tokens: input.inputTokens,
        output_tokens: input.outputTokens,
        estimated_cost_usd: input.estimatedCostUsd,
        expires_at: expiresAt,
      },
      {
        onConflict: "prompt_hash,operation,worker,cache_version,article_id,event_id",
      }
    );
  } catch (err) {
    console.warn(
      "[prompt-cache] store failed:",
      err instanceof Error ? err.message : err
    );
  }
}
