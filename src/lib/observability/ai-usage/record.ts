/**
 * Multi-provider AI usage log — `ai_provider_usage_events` covers every provider
 * (gemini/groq/cloudflare/openrouter/openai) going forward. The legacy
 * `openai_usage_events` table (see src/lib/observability/openai-cost) is left
 * untouched for backward-compatible dashboard continuity and keeps recording
 * OpenAI calls independently when OpenAI is enabled.
 */

import { createAdminServerClient } from "@/lib/supabase";
import { asJsonObject } from "@/types/json";
import { hashPrompt } from "@/lib/observability/openai-cost/token-estimate";
import type { AiProviderId } from "@/lib/ai/providers/types";

export type AiUsageEndpoint =
  | "chat.completions"
  | "embeddings"
  | "images.generations"
  | "generateContent";

export type AiUsageContext = {
  worker?: string;
  cron?: string;
  articleId?: string;
  eventId?: string;
  tenantId?: string;
};

export type AiProviderUsageRecord = {
  provider: AiProviderId;
  operation: string;
  endpoint: AiUsageEndpoint;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
  retryCount?: number;
  success: boolean;
  quotaConsumed?: number;
  quotaRemaining?: number;
  fallbackReason?: string;
  promptHash?: string;
  promptChars?: number;
  completionChars?: number;
  metadata?: Record<string, unknown>;
} & AiUsageContext;

export async function recordAiProviderUsage(
  record: AiProviderUsageRecord
): Promise<void> {
  try {
    const supabase = createAdminServerClient();
    await supabase.from("ai_provider_usage_events" as never).insert({
      provider: record.provider,
      worker: record.worker ?? null,
      operation: record.operation,
      cron_job: record.cron ?? null,
      article_id: record.articleId ?? null,
      event_id: record.eventId ?? null,
      tenant_id: record.tenantId ?? null,
      model: record.model,
      endpoint: record.endpoint,
      input_tokens: record.inputTokens,
      output_tokens: record.outputTokens,
      cached_tokens: record.cachedTokens ?? 0,
      estimated_cost_usd: record.estimatedCostUsd ?? 0,
      latency_ms: record.latencyMs ?? null,
      retry_count: record.retryCount ?? 0,
      success: record.success,
      quota_consumed: record.quotaConsumed ?? null,
      quota_remaining: record.quotaRemaining ?? null,
      fallback_reason: record.fallbackReason ?? null,
      prompt_hash: record.promptHash ?? null,
      prompt_chars: record.promptChars ?? null,
      completion_chars: record.completionChars ?? null,
      metadata: asJsonObject(record.metadata ?? {}),
    } as never);
  } catch (err) {
    console.warn(
      "[ai-usage] record failed:",
      err instanceof Error ? err.message : err
    );
  }
}

export function buildAiUsageRecord(input: {
  provider: AiProviderId;
  operation: string;
  endpoint: AiUsageEndpoint;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  latencyMs?: number;
  retryCount?: number;
  success: boolean;
  system?: string;
  user?: string;
  completion?: string;
  quotaConsumed?: number;
  quotaRemaining?: number;
  fallbackReason?: string;
  context?: AiUsageContext;
  metadata?: Record<string, unknown>;
}): AiProviderUsageRecord {
  const promptText = [input.system, input.user].filter(Boolean).join("\n");
  const promptHash = promptText ? hashPrompt(promptText) : undefined;

  return {
    provider: input.provider,
    operation: input.operation,
    endpoint: input.endpoint,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    cachedTokens: input.cachedTokens ?? 0,
    // Non-OpenAI providers are used only while on a free tier — cost is 0
    // unless a paid-provider adapter overrides this explicitly.
    estimatedCostUsd: input.provider === "openai" ? undefined : 0,
    latencyMs: input.latencyMs,
    retryCount: input.retryCount ?? 0,
    success: input.success,
    quotaConsumed: input.quotaConsumed,
    quotaRemaining: input.quotaRemaining,
    fallbackReason: input.fallbackReason,
    promptHash,
    promptChars: promptText ? promptText.length : undefined,
    completionChars: input.completion?.length,
    worker: input.context?.worker,
    cron: input.context?.cron,
    articleId: input.context?.articleId,
    eventId: input.context?.eventId,
    tenantId: input.context?.tenantId,
    metadata: input.metadata,
  };
}

/** Fire-and-forget recording — never blocks the AI pipeline. */
export function logAiProviderUsage(record: AiProviderUsageRecord): void {
  void recordAiProviderUsage(record);
}
