/**
 * Per-provider model scoping.
 *
 * A `model` override on a ChatCompletionRequest is written for ONE provider
 * (typically the primary, e.g. CODECRAFT_EDITORIAL_MODEL). Forwarding it to
 * every provider in the failover chain sent DeepSeek model ids to Gemini and
 * Groq, which 400/404 every time — so a healthy fallback looked broken and the
 * usage log recorded the wrong model for those attempts.
 *
 * An override is honoured only by the provider that owns that model family.
 * Model ids whose family we cannot attribute (deepseek-*, kimi-*, …) belong to
 * the OpenAI-compatible gateway (codecraft) only.
 */

import type { AiProviderId } from "@/lib/ai/providers/types";

const FAMILY_MATCHERS: Array<{ provider: AiProviderId; test: RegExp }> = [
  { provider: "gemini", test: /^(models\/)?gemini-/i },
  { provider: "openai", test: /^(gpt-|chatgpt|o\d(-|$)|text-embedding|dall-e)/i },
  { provider: "groq", test: /^(llama|meta-llama\/|openai\/gpt-oss|qwen\/|moonshotai\/|mixtral|gemma|compound)/i },
  { provider: "openrouter", test: /(:free$|^[a-z0-9-]+\/[a-z0-9._-]+)/i },
];

/** Provider that owns this model family, or null when it is not attributable. */
export function providerForModel(model: string): AiProviderId | null {
  const m = model.trim();
  if (!m) return null;
  for (const { provider, test } of FAMILY_MATCHERS) {
    if (test.test(m)) return provider;
  }
  return null;
}

/** True when `provider` may be asked to run `model`. */
export function modelBelongsToProvider(
  provider: AiProviderId,
  model: string | null | undefined
): boolean {
  if (!model?.trim()) return false;
  const owner = providerForModel(model);
  if (owner === null) return provider === "codecraft";
  return owner === provider;
}

/** The override to forward to `provider`, or undefined so it uses its own configured model. */
export function scopeModelOverride(
  provider: AiProviderId,
  override: string | null | undefined
): string | undefined {
  return modelBelongsToProvider(provider, override) ? override!.trim() : undefined;
}
