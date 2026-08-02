/**
 * Cloudflare Workers AI embeddings adapter — free-tier primary for both the
 * ephemeral event-clustering similarity boost and the persisted
 * intelligence_embeddings pipeline (see router.ts's EMBEDDING_CHAIN). REST
 * shape differs from OpenAI's embeddings endpoint, so it gets its own
 * request/response mapping, but plugs into the same health registry, retry
 * policy, and quota controller as cloudflare-images.ts / gemini.ts.
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
  reconcileQuotaUsage,
  reserveCloudflareNeurons,
  reserveQuota,
} from "@/lib/ai/providers/quota";
import { buildAiUsageRecord, logAiProviderUsage } from "@/lib/observability/ai-usage/record";
import type { AiUsageContext } from "@/lib/observability/ai-usage/record";
import { estimateTokensFromText } from "@/lib/observability/openai-cost/token-estimate";
import type { ClassifiedAiError } from "@/lib/ai/providers/types";

const CLOUDFLARE_ACCOUNTS_URL = "https://api.cloudflare.com/client/v4/accounts";

/**
 * Cloudflare's current recommended multilingual embedding model on Workers
 * AI, matching this repo's brief for "a model equivalent to BGE-M3" — BGE-M3
 * outputs 1024-dim vectors. Both the model id and DIMENSIONS below are
 * current as of authoring only, not confirmed from a live API response —
 * verify against Cloudflare's Workers AI catalog
 * (https://developers.cloudflare.com/workers-ai/models/) before relying on
 * them in production, and before wiring up the intelligence_embeddings_cf
 * migration's vector column dimension.
 */
export const CLOUDFLARE_EMBEDDING_DIMENSIONS = 1024;

export function isCloudflareEmbeddingsConfigured(): boolean {
  return (
    Boolean(process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) &&
    Boolean(process.env.CLOUDFLARE_API_TOKEN?.trim())
  );
}

function resolveCloudflareEmbeddingModel(): string {
  return process.env.CLOUDFLARE_EMBEDDING_MODEL?.trim() || "@cf/baai/bge-m3";
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
  if (status === 400) {
    return { code: "ai_invalid_request", message, httpStatus: status, retryable: false, authFailure: false, invalidRequest: true, rateLimited: false };
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

/** Normalize Workers AI's embedding response — batch calls return a nested
 * `[n][dims]` array, but a single-text call can return a flat `[dims]`
 * array instead; wrap defensively so callers always get `number[][]`. */
function normalizeVectors(data: unknown): number[][] {
  if (!Array.isArray(data) || data.length === 0) return [];
  return Array.isArray(data[0]) ? (data as number[][]) : [data as number[]];
}

async function postCloudflareEmbeddings(
  texts: string[]
): Promise<{ vectors: number[][]; model: string; latencyMs: number; inputTokens: number }> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID!.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN!.trim();
  const model = resolveCloudflareEmbeddingModel();
  const started = Date.now();
  recordProviderRequestStarted("cloudflare", "embeddings");

  const controller = new AbortController();
  const timeoutMs = 20_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${CLOUDFLARE_ACCOUNTS_URL}/${accountId}/ai/run/${model}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: texts }),
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

    const json = (await res.json()) as {
      result?: { shape?: number[]; data?: unknown };
      success?: boolean;
      errors?: Array<{ code?: number; message?: string }>;
    };

    if (json.success === false) {
      const message = json.errors?.[0]?.message?.slice(0, 240) || "Cloudflare embeddings request failed";
      const classified: ClassifiedAiError = { code: "ai_http_error", message, retryable: false, authFailure: false, invalidRequest: false, rateLimited: false };
      markProviderUnhealthy("cloudflare", { reason: message });
      throw classified;
    }

    const vectors = normalizeVectors(json.result?.data);
    if (!vectors.length || !vectors[0]?.length) {
      const empty: ClassifiedAiError = { code: "ai_empty_response", message: "Empty Cloudflare embeddings response", retryable: false, authFailure: false, invalidRequest: false, rateLimited: false };
      throw empty;
    }

    // Fail closed rather than silently persist a vector of the wrong
    // dimension into the fixed-width intelligence_embeddings_cf column.
    const wrongDimension = vectors.find((v) => v.length !== CLOUDFLARE_EMBEDDING_DIMENSIONS);
    if (wrongDimension) {
      const mismatch: ClassifiedAiError = {
        code: "ai_invalid_request",
        message: `Cloudflare embedding returned ${wrongDimension.length} dimensions, expected ${CLOUDFLARE_EMBEDDING_DIMENSIONS}`,
        retryable: false,
        authFailure: false,
        invalidRequest: true,
        rateLimited: false,
      };
      throw mismatch;
    }

    recordProviderRequestCompleted("cloudflare", "embeddings", latencyMs);
    return {
      vectors,
      model,
      latencyMs,
      inputTokens: estimateTokensFromText(texts.join(" ")),
    };
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

export async function requestCloudflareEmbeddings(input: {
  operation: string;
  texts: string[];
  context?: AiUsageContext;
}): Promise<{ vectors: number[][]; model: string } | { error: ClassifiedAiError }> {
  if (!isCloudflareEmbeddingsConfigured()) {
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
  if (!input.texts.length) {
    return { vectors: [], model: resolveCloudflareEmbeddingModel() };
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

  // estimatedTokens uses the same char-based heuristic as everywhere else in
  // this codebase (see estimateTokensFromText) rather than raw char count,
  // so it lines up with the token-per-minute/day quota scopes in quota.ts.
  const estimatedTokens = estimateTokensFromText(input.texts.join(" "));
  const quota = await reserveQuota({
    provider: "cloudflare",
    operation: input.operation,
    estimatedTokens,
  });
  if (!quota.allowed) {
    return {
      error: {
        code: "ai_quota_exhausted",
        message: quota.reason ?? "cloudflare quota exhausted",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: true,
      },
    };
  }

  // Cloudflare's free tier is one shared daily neuron pool across every
  // model (images included) — the rpm/tpm/rpd/tpd reservation above bounds
  // request rate, but the neuron budget is the real binding constraint.
  const estimatedNeurons = estimateCloudflareNeurons({ kind: "embedding", inputTokens: estimatedTokens });
  const neurons = await reserveCloudflareNeurons(estimatedNeurons);
  if (!neurons.allowed) {
    void reconcileQuotaUsage(quota.reservation, { inputTokens: 0, outputTokens: 0 });
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
    void reconcileQuotaUsage(quota.reservation, { inputTokens: 0, outputTokens: 0 });
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

  const started = Date.now();
  let retryCount = 0;
  try {
    const { vectors, model, latencyMs, inputTokens } = await withTransientAiRetry({
      operation: input.operation,
      provider: "cloudflare",
      isRetryable: (e) => e.retryable,
      fn: async (attempt) => {
        retryCount = attempt;
        return postCloudflareEmbeddings(input.texts);
      },
    });

    void reconcileQuotaUsage(quota.reservation, { inputTokens, outputTokens: 0 });
    // Reconcile against the *actual* token count (may differ slightly from
    // the pre-request estimate), keeping neuron accounting consistent with
    // the real cost formula rather than the estimate used to reserve.
    void reconcileCloudflareNeurons(
      estimatedNeurons,
      estimateCloudflareNeurons({ kind: "embedding", inputTokens })
    );

    logAiProviderUsage(
      buildAiUsageRecord({
        provider: "cloudflare",
        operation: input.operation,
        endpoint: "embeddings",
        model,
        inputTokens,
        outputTokens: 0,
        latencyMs,
        retryCount,
        success: true,
        context: input.context,
        metadata: { batchSize: input.texts.length, dimensions: CLOUDFLARE_EMBEDDING_DIMENSIONS, estimatedNeurons },
      })
    );

    return { vectors, model };
  } catch (err) {
    void reconcileQuotaUsage(quota.reservation, { inputTokens: 0, outputTokens: 0 });
    void reconcileCloudflareNeurons(estimatedNeurons, 0);
    const error =
      err && typeof err === "object" && "code" in err
        ? (err as ClassifiedAiError)
        : { code: "ai_network_error", message: "Cloudflare embeddings request failed", retryable: true, authFailure: false, invalidRequest: false, rateLimited: false };
    logAiProviderUsage(
      buildAiUsageRecord({
        provider: "cloudflare",
        operation: input.operation,
        endpoint: "embeddings",
        model: resolveCloudflareEmbeddingModel(),
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        retryCount,
        success: false,
        context: input.context,
        fallbackReason: error.code,
      })
    );
    return { error };
  } finally {
    slot.release();
  }
}
