import { createHash } from "crypto";

/** Rough token estimate (~4 chars/token for English, ~2.5 for Hindi/Devanagari) */
export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  const devanagari = (text.match(/[\u0900-\u097F]/g) ?? []).length;
  const ratio = devanagari > text.length * 0.3 ? 2.5 : 4;
  return Math.ceil(text.length / ratio);
}

export function hashPrompt(text: string): string {
  return createHash("sha256").update(text.trim()).digest("hex").slice(0, 16);
}

export type OpenAiUsageFromResponse = {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
};

export function parseChatCompletionUsage(json: unknown): OpenAiUsageFromResponse {
  const usage = (json as { usage?: Record<string, unknown> })?.usage;
  if (!usage) return { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };

  const promptDetails = usage.prompt_tokens_details as
    | { cached_tokens?: number }
    | undefined;

  return {
    inputTokens: Number(usage.prompt_tokens ?? 0),
    outputTokens: Number(usage.completion_tokens ?? 0),
    cachedTokens: Number(promptDetails?.cached_tokens ?? usage.cached_tokens ?? 0),
  };
}

export function parseEmbeddingUsage(json: unknown): OpenAiUsageFromResponse {
  const usage = (json as { usage?: Record<string, unknown> })?.usage;
  if (!usage) return { inputTokens: 0, outputTokens: 0, cachedTokens: 0 };
  const tokens = Number(usage.prompt_tokens ?? usage.total_tokens ?? 0);
  return { inputTokens: tokens, outputTokens: 0, cachedTokens: 0 };
}
