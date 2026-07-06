/**
 * OpenAI image generation with auth-failure cooldown (no retries on 401/403).
 */

import {
  classifyAiHttpFailure,
  classifyAiNetworkError,
} from "@/lib/ai/providers/errors";
import {
  isProviderHealthy,
  markProviderUnhealthy,
  recordProviderRequestCompleted,
  recordProviderRequestStarted,
} from "@/lib/ai/providers/health";
import type { ClassifiedAiError } from "@/lib/ai/providers/types";
import {
  buildUsageRecord,
  logOpenAiUsage,
} from "@/lib/observability/openai-cost";
import type { OpenAiCallContext } from "@/lib/observability/openai-cost";

const OPENAI_IMAGES_URL = "https://api.openai.com/v1/images/generations";

export async function requestImageGeneration(input: {
  operation: string;
  prompt: string;
  model?: string;
  size?: string;
  timeoutMs?: number;
  extraBody?: Record<string, unknown>;
  context?: OpenAiCallContext;
}): Promise<{ url: string } | { error: ClassifiedAiError }> {
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
      response_format: "url",
      ...input.extraBody,
    };

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
      markProviderUnhealthy("openai", {
        reason: classified.authFailure
          ? "openai_unauthorized"
          : classified.message,
        httpStatus: res.status,
        authFailure: classified.authFailure,
        rateLimited: classified.rateLimited,
      });
      return { error: classified };
    }

    const json = (await res.json()) as {
      data?: Array<{ url?: string }>;
    };
    const url = json.data?.[0]?.url;
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

    return { url };
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
