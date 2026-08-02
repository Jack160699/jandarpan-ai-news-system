/**
 * Image generation — free-first provider chain (see router.ts's IMAGE_CHAIN):
 * Cloudflare Workers AI is tried first, OpenAI DALL-E only when
 * AI_PROVIDER_OPENAI_ENABLED=true. The OpenAI request/response handling below
 * (auth-failure cooldown, no retries on 401/403) is unchanged from the
 * OpenAI-only implementation this replaces.
 */

import {
  classifyAiHttpFailure,
  classifyAiNetworkError,
} from "@/lib/ai/providers/errors";
import {
  isProviderHealthy,
  markProviderUnhealthy,
  recordProviderFallback,
  recordProviderRequestCompleted,
  recordProviderRequestStarted,
} from "@/lib/ai/providers/health";
import { resolveImageChain } from "@/lib/ai/providers/router";
import {
  isCloudflareConfigured,
  requestCloudflareImageGeneration,
  resolveCloudflareImageModel,
} from "@/lib/ai/providers/cloudflare-images";
import type { AiProviderId, ClassifiedAiError } from "@/lib/ai/providers/types";
import {
  buildUsageRecord,
  logOpenAiUsage,
} from "@/lib/observability/openai-cost";
import type { OpenAiCallContext } from "@/lib/observability/openai-cost";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

export type ImageGenerationResult =
  | { url: string; provider: AiProviderId; model: string }
  | { error: ClassifiedAiError };

export type ImageGenerationInput = {
  operation: string;
  prompt: string;
  model?: string;
  size?: string;
  timeoutMs?: number;
  extraBody?: Record<string, unknown>;
  context?: OpenAiCallContext;
};

async function requestOpenAiImageGeneration(
  input: ImageGenerationInput
): Promise<ImageGenerationResult> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return {
      error: {
        code: "ai_unavailable",
        message: "OPENAI_API_KEY not set",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    };
  }

  if (!isProviderHealthy("openai")) {
    return {
      error: {
        code: "ai_provider_cooldown",
        message: "openai temporarily unhealthy",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    };
  }

  const model =
    input.model?.trim() ||
    process.env.NEWSROOM_IMAGE_MODEL?.trim() ||
    process.env.OPENAI_IMAGE_MODEL?.trim() ||
    "dall-e-3";

  const started = Date.now();
  recordProviderRequestStarted("openai", input.operation);

  const controller = new AbortController();
  const timeoutMs = input.timeoutMs ?? 60_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model,
      prompt: input.prompt.slice(0, 4000),
      n: 1,
      size: input.size ?? (model.includes("dall-e-3") ? "1792x1024" : "1024x1024"),
      ...input.extraBody,
    };
    // DALL-E supports explicit URL output. Current GPT Image models return
    // b64_json by default and reject the legacy response_format parameter.
    if (model.includes("dall-e")) {
      body.response_format = "url";
    }

    const res = await fetch(OPENAI_IMAGES_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const classified = classifyAiHttpFailure(res.status, detail);
      if (
        classified.authFailure ||
        classified.rateLimited ||
        (res.status >= 500 && classified.retryable)
      ) {
        markProviderUnhealthy("openai", {
          reason: classified.authFailure
            ? "openai_unauthorized"
            : classified.message,
          httpStatus: res.status,
          authFailure: classified.authFailure,
          rateLimited: classified.rateLimited,
        });
      }
      return { error: classified };
    }

    const json = (await res.json()) as {
      data?: Array<{ url?: string; b64_json?: string }>;
    };
    const item = json.data?.[0];
    const url =
      item?.url ??
      (item?.b64_json
        ? `data:image/png;base64,${item.b64_json}`
        : undefined);
    if (!url) {
      return {
        error: {
          code: "ai_image_empty",
          message: "No image URL returned",
          retryable: false,
          authFailure: false,
          invalidRequest: false,
          rateLimited: false,
        },
      };
    }

    recordProviderRequestCompleted(
      "openai",
      input.operation,
      Date.now() - started
    );

    const imageSize = String(body.size ?? "1024x1024");
    logOpenAiUsage(
      buildUsageRecord({
        operation: input.operation,
        endpoint: "images.generations",
        model,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        success: true,
        user: input.prompt,
        imageSize,
        imageCount: 1,
        context: input.context,
      })
    );

    return { url, provider: "openai", model };
  } catch (err) {
    const classified = classifyAiNetworkError(err);
    logOpenAiUsage(
      buildUsageRecord({
        operation: input.operation,
        endpoint: "images.generations",
        model,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        success: false,
        user: input.prompt,
        context: input.context,
        metadata: { error: classified.code },
      })
    );
    return { error: classified };
  } finally {
    clearTimeout(timer);
  }
}

async function requestCloudflareImage(
  input: ImageGenerationInput
): Promise<ImageGenerationResult> {
  const result = await requestCloudflareImageGeneration({
    operation: input.operation,
    prompt: input.prompt,
    timeoutMs: input.timeoutMs,
    context: input.context,
  });
  if ("error" in result) return result;
  return { url: result.url, provider: "cloudflare", model: resolveCloudflareImageModel() };
}

/**
 * Free-first image generation. Provider order comes from router.ts's
 * IMAGE_CHAIN (Cloudflare Workers AI first; OpenAI only appears when
 * AI_PROVIDER_OPENAI_ENABLED=true). Returns first success or the last
 * failure across the chain, including which provider/model actually served
 * the image so callers can keep provenance accurate.
 */
export async function requestImageGeneration(
  input: ImageGenerationInput
): Promise<ImageGenerationResult> {
  const chain = resolveImageChain();

  const attempts: Array<{ id: AiProviderId; invoke: () => Promise<ImageGenerationResult> }> = [];
  for (const providerId of chain) {
    if (providerId === "cloudflare") {
      if (isCloudflareConfigured()) attempts.push({ id: "cloudflare", invoke: () => requestCloudflareImage(input) });
    } else if (providerId === "openai") {
      if (process.env.OPENAI_API_KEY?.trim()) attempts.push({ id: "openai", invoke: () => requestOpenAiImageGeneration(input) });
    }
  }

  if (!attempts.length) {
    return {
      error: {
        code: "ai_unavailable",
        message: "No image provider configured",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    };
  }

  let lastFailure: ImageGenerationResult | null = null;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i]!;
    const result = await attempt.invoke();
    if (!("error" in result)) return result;

    lastFailure = result;
    const next = attempts[i + 1];
    if (next) {
      recordProviderFallback(attempt.id, next.id, result.error.code);
    }
  }

  return (
    lastFailure ?? {
      error: {
        code: "ai_unavailable",
        message: "No image provider configured",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    }
  );
}
