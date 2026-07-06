/**
 * Recording helper for direct fetch() OpenAI callers (bypass central provider).
 */

import {
  buildUsageRecord,
  logOpenAiUsage,
  parseChatCompletionUsage,
  parseEmbeddingUsage,
} from "@/lib/observability/openai-cost";
import type { OpenAiCallContext } from "@/lib/observability/openai-cost";

export function recordDirectChatCompletion(input: {
  operation: string;
  model: string;
  system?: string;
  user?: string;
  json?: unknown;
  content?: string;
  latencyMs: number;
  success: boolean;
  context?: OpenAiCallContext;
  retryCount?: number;
}): void {
  const usage = input.json
    ? parseChatCompletionUsage(input.json)
    : { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };

  logOpenAiUsage(
    buildUsageRecord({
      operation: input.operation,
      endpoint: "chat.completions",
      model: input.model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cachedTokens: usage.cachedTokens,
      latencyMs: input.latencyMs,
      retryCount: input.retryCount,
      success: input.success,
      system: input.system,
      user: input.user,
      completion: input.content,
      context: input.context,
    })
  );
}

export function recordDirectEmbedding(input: {
  operation: string;
  model: string;
  texts: string[];
  json?: unknown;
  latencyMs: number;
  success: boolean;
  context?: OpenAiCallContext;
}): void {
  const usage = input.json
    ? parseEmbeddingUsage(input.json)
    : { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };

  logOpenAiUsage(
    buildUsageRecord({
      operation: input.operation,
      endpoint: "embeddings",
      model: input.model,
      inputTokens: usage.inputTokens,
      outputTokens: 0,
      latencyMs: input.latencyMs,
      success: input.success,
      user: input.texts.join("\n").slice(0, 2000),
      context: input.context,
      metadata: { batchSize: input.texts.length },
    })
  );
}

export function recordDirectTts(input: {
  operation: string;
  model: string;
  script: string;
  latencyMs: number;
  success: boolean;
  context?: OpenAiCallContext;
}): void {
  logOpenAiUsage(
    buildUsageRecord({
      operation: input.operation,
      endpoint: "audio.speech",
      model: input.model,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: input.latencyMs,
      success: input.success,
      user: input.script,
      charCount: input.script.length,
      context: input.context,
    })
  );
}
