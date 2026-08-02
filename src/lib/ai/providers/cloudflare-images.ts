/**
 * Cloudflare Workers AI image-generation adapter — free-tier primary image
 * provider (see router.ts's IMAGE_CHAIN). Workers AI's REST response shape
 * varies by model family: FLUX/SDXL text-to-image models typically return
 * raw image bytes, but some models instead return a JSON envelope
 * (`{ result: { image: "<base64>" }, success: true }`) — this adapter checks
 * the response Content-Type and handles both defensively.
 */

import {
  isProviderHealthy,
  markProviderUnhealthy,
  recordProviderRequestCompleted,
  recordProviderRequestStarted,
} from "@/lib/ai/providers/health";
import { withTransientAiRetry } from "@/lib/ai/providers/retry";
import {
  acquireConcurrencySlot,
  estimateCloudflareNeurons,
  reconcileCloudflareNeurons,
  reserveCloudflareNeurons,
} from "@/lib/ai/providers/quota";
import { buildAiUsageRecord, logAiProviderUsage } from "@/lib/observability/ai-usage/record";
import type { AiUsageContext } from "@/lib/observability/ai-usage/record";
import type { ClassifiedAiError } from "@/lib/ai/providers/types";

const CLOUDFLARE_ACCOUNTS_URL = "https://api.cloudflare.com/client/v4/accounts";

/**
 * Default image dimensions/steps — configurable per call, but these are the
 * values used for capacity forecasting (see quota.ts's
 * getCloudflareNeuronForecast) and the ones a plain requestCloudflareImageGeneration()
 * call with no explicit width/height/steps will use. At 1024x1024/4 steps
 * this reserves 57.6 neurons ((2*2 tiles * 4.8) + (4 steps * 9.6)).
 */
const DEFAULT_IMAGE_WIDTH = 1024;
const DEFAULT_IMAGE_HEIGHT = 1024;
const DEFAULT_IMAGE_STEPS = 4;

export function isCloudflareConfigured(): boolean {
  return (
    Boolean(process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) &&
    Boolean(process.env.CLOUDFLARE_API_TOKEN?.trim())
  );
}

/**
 * Model id current as of authoring — verify against Cloudflare's Workers AI
 * catalog (https://developers.cloudflare.com/workers-ai/models/) before
 * relying on it in production, the catalog renames/deprecates model ids.
 */
export function resolveCloudflareImageModel(): string {
  return (
    process.env.CLOUDFLARE_IMAGE_MODEL?.trim() ||
    "@cf/black-forest-labs/flux-1-schnell"
  );
}

function classifyCloudflareFailure(status: number, body: string): ClassifiedAiError {
  let message = `HTTP ${status}`;
  try {
    const json = JSON.parse(body) as {
      errors?: Array<{ code?: number; message?: string }>;
    };
    message = json.errors?.[0]?.message?.slice(0, 240) || message;
  } catch {
    // non-JSON body, keep default message
  }

  if (status === 401 || status === 403) {
    return { code: "ai_unauthorized", message, httpStatus: status, retryable: false, authFailure: true, invalidRequest: false, rateLimited: false };
  }
  if (status === 429) {
    // quota.ts already gates request volume upstream of this adapter, so a
    // 429 here means the account budget itself is exhausted, not retryable.
    return { code: "ai_quota_exhausted", message, httpStatus: status, retryable: false, authFailure: false, invalidRequest: false, rateLimited: true };
  }
  if (status >= 500) {
    return { code: "ai_upstream_error", message, httpStatus: status, retryable: true, authFailure: false, invalidRequest: false, rateLimited: false };
  }
  return { code: "ai_http_error", message, httpStatus: status, retryable: false, authFailure: false, invalidRequest: false, rateLimited: false };
}

async function postCloudflareImage(input: {
  operation: string;
  prompt: string;
  timeoutMs: number;
  width: number;
  height: number;
  steps: number;
}): Promise<{ url: string; latencyMs: number }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!.trim();
  const model = resolveCloudflareImageModel();
  const started = Date.now();
  recordProviderRequestStarted("cloudflare", input.operation);
  console.log(
    `[cloudflare-image] requesting ${model} width=${input.width} height=${input.height} steps=${input.steps}`
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), input.timeoutMs);

  try {
    const res = await fetch(`${CLOUDFLARE_ACCOUNTS_URL}/${accountId}/ai/run/${model}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: input.prompt.slice(0, 4000),
        width: input.width,
        height: input.height,
        steps: input.steps,
      }),
    });

    const latencyMs = Date.now() - started;

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const classified = classifyCloudflareFailure(res.status, detail);
      markProviderUnhealthy("cloudflare", {
        reason: classified.authFailure ? "cloudflare_unauthorized" : classified.message,
        httpStatus: res.status,
        authFailure: classified.authFailure,
        rateLimited: classified.rateLimited,
      });
      throw classified;
    }

    const contentType = res.headers.get("content-type") ?? "";
    let url: string;

    if (contentType.startsWith("image/")) {
      const buf = await res.arrayBuffer();
      url = `data:${contentType};base64,${Buffer.from(buf).toString("base64")}`;
    } else {
      const json = (await res.json()) as {
        result?: { image?: string };
        success?: boolean;
        errors?: Array<{ code?: number; message?: string }>;
      };
      if (json.success === false || !json.result?.image) {
        const message =
          json.errors?.[0]?.message?.slice(0, 240) || "Empty Cloudflare image response";
        const empty: ClassifiedAiError = { code: "ai_empty_response", message, retryable: false, authFailure: false, invalidRequest: false, rateLimited: false };
        throw empty;
      }
      url = `data:image/png;base64,${json.result.image}`;
    }

    recordProviderRequestCompleted("cloudflare", input.operation, latencyMs);
    return { url, latencyMs };
  } catch (err) {
    if (err && typeof err === "object" && "retryable" in err && "code" in err) throw err;
    const isAbort = err instanceof Error && err.name === "AbortError";
    const message = isAbort
      ? "Request timed out"
      : err instanceof Error
        ? err.message.slice(0, 240)
        : "Cloudflare request failed";
    const network: ClassifiedAiError = { code: isAbort ? "ai_timeout" : "ai_network_error", message, retryable: true, authFailure: false, invalidRequest: false, rateLimited: false };
    throw network;
  } finally {
    clearTimeout(timer);
  }
}

export async function requestCloudflareImageGeneration(input: {
  operation: string;
  prompt: string;
  timeoutMs?: number;
  /** Defaults to 1024x1024/4 steps — see DEFAULT_IMAGE_* above. Always pass these explicitly when the caller knows the real target size, since neuron accounting is size/step-dependent. */
  width?: number;
  height?: number;
  steps?: number;
  priority?: "breaking" | "normal" | "backfill";
  context?: AiUsageContext;
}): Promise<{ url: string } | { error: ClassifiedAiError }> {
  if (!isCloudflareConfigured()) {
    return {
      error: {
        code: "ai_unavailable",
        message: "CLOUDFLARE_ACCOUNT_ID/CLOUDFLARE_API_TOKEN not set",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    };
  }
  if (!isProviderHealthy("cloudflare")) {
    return {
      error: {
        code: "ai_provider_cooldown",
        message: "cloudflare temporarily unhealthy",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    };
  }

  const width = input.width ?? DEFAULT_IMAGE_WIDTH;
  const height = input.height ?? DEFAULT_IMAGE_HEIGHT;
  const steps = input.steps ?? DEFAULT_IMAGE_STEPS;
  const estimatedNeurons = estimateCloudflareNeurons({ kind: "image", width, height, steps });

  const neurons = await reserveCloudflareNeurons(estimatedNeurons, input.priority);
  if (!neurons.allowed) {
    return {
      error: {
        code: "ai_quota_exhausted",
        message: neurons.reason ?? "cloudflare daily neuron budget exhausted",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: true,
      },
    };
  }

  const slot = acquireConcurrencySlot("cloudflare");
  if (!slot.acquired) {
    void reconcileCloudflareNeurons(estimatedNeurons, 0);
    return {
      error: {
        code: "ai_provider_busy",
        message: "cloudflare concurrency limit reached",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    };
  }

  const model = resolveCloudflareImageModel();
  const timeoutMs = input.timeoutMs ?? 60_000;
  const started = Date.now();
  let retryCount = 0;
  try {
    const { url, latencyMs } = await withTransientAiRetry({
      operation: input.operation,
      provider: "cloudflare",
      isRetryable: (e) => e.retryable,
      fn: async (attempt) => {
        retryCount = attempt;
        return postCloudflareImage({ operation: input.operation, prompt: input.prompt, timeoutMs, width, height, steps });
      },
    });

    // Cloudflare's response doesn't currently report real neuron cost, so
    // the reservation estimate stands as the final accounting figure.
    void reconcileCloudflareNeurons(estimatedNeurons, estimatedNeurons);

    logAiProviderUsage(
      buildAiUsageRecord({
        provider: "cloudflare",
        operation: input.operation,
        endpoint: "images.generations",
        model,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        retryCount,
        success: true,
        user: input.prompt,
        context: input.context,
        metadata: { width, height, steps, estimatedNeurons },
      })
    );

    return { url };
  } catch (err) {
    void reconcileCloudflareNeurons(estimatedNeurons, 0);
    const error =
      err && typeof err === "object" && "code" in err
        ? (err as ClassifiedAiError)
        : { code: "ai_network_error", message: "Cloudflare request failed", retryable: true, authFailure: false, invalidRequest: false, rateLimited: false };
    logAiProviderUsage(
      buildAiUsageRecord({
        provider: "cloudflare",
        operation: input.operation,
        endpoint: "images.generations",
        model,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        retryCount,
        success: false,
        user: input.prompt,
        context: input.context,
        fallbackReason: error.code,
        metadata: { width, height, steps, estimatedNeurons },
      })
    );
    return { error };
  } finally {
    slot.release();
  }
}
