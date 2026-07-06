/**
 * Record OpenAI usage from actual API response metadata (not queue-size estimates).
 */

import { createAdminServerClient } from "@/lib/supabase";
import { asJsonObject } from "@/types/json";
import { estimateCostUsd } from "@/lib/observability/openai-cost/pricing";
import type {
  OpenAiCallContext,
  OpenAiEndpoint,
  OpenAiUsageRecord,
} from "@/lib/observability/openai-cost/types";
import { hashPrompt } from "@/lib/observability/openai-cost/token-estimate";

export async function recordOpenAiUsage(
  record: OpenAiUsageRecord
): Promise<void> {
  try {
    const supabase = createAdminServerClient();
    await supabase.from("openai_usage_events").insert({
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
      estimated_cost_usd: record.estimatedCostUsd,
      latency_ms: record.latencyMs ?? null,
      retry_count: record.retryCount ?? 0,
      success: record.success,
      prompt_hash: record.promptHash ?? null,
      prompt_chars: record.promptChars ?? null,
      completion_chars: record.completionChars ?? null,
      metadata: asJsonObject(record.metadata ?? {}),
    });
  } catch (err) {
    console.warn(
      "[openai-cost] record failed:",
      err instanceof Error ? err.message : err
    );
  }
}

export function buildUsageRecord(input: {
  operation: string;
  endpoint: OpenAiEndpoint;
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
  imageSize?: string;
  imageCount?: number;
  charCount?: number;
  context?: OpenAiCallContext;
  metadata?: Record<string, unknown>;
}): OpenAiUsageRecord {
  const promptText = [input.system, input.user].filter(Boolean).join("\n");
  const promptHash = promptText ? hashPrompt(promptText) : undefined;

  const estimatedCostUsd = estimateCostUsd({
    endpoint: input.endpoint,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    cachedTokens: input.cachedTokens,
    imageSize: input.imageSize,
    imageCount: input.imageCount,
    charCount: input.charCount,
  });

  return {
    operation: input.operation,
    endpoint: input.endpoint,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    cachedTokens: input.cachedTokens ?? 0,
    estimatedCostUsd,
    latencyMs: input.latencyMs,
    retryCount: input.retryCount ?? 0,
    success: input.success,
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

/** Fire-and-forget recording — never blocks AI pipeline */
export function logOpenAiUsage(record: OpenAiUsageRecord): void {
  void recordOpenAiUsage(record);
}
