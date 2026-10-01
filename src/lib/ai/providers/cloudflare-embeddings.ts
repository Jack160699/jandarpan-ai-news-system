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
import { estimateTokensFromText } from "@/lib/observability/ai-cost/token-estimate";
import { planEmbeddingInput, type EmbeddingPlan } from "@/lib/ai/providers/embedding-input";
import type { ClassifiedAiError } from "@/lib/ai/providers/types";

const CLOUDFLARE_ACCOUNTS_URL = "https://api.cloudflare.com/client/v4/accounts";

/**
 * Circuit/health key for embeddings ONLY. Cloudflare serves several capabilities from one account; they must not
 * share a circuit - an embeddings failure (e.g. an oversized request) once opened the shared "cloudflare" circuit and
 * made image processing report provider_unavailable. Image operations use their own key (cloudflare-images.ts).
 */
export const CLOUDFLARE_EMBEDDINGS_HEALTH_KEY = "cloudflare:embeddings";

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
  recordProviderRequestStarted(CLOUDFLARE_EMBEDDINGS_HEALTH_KEY, "embeddings");

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
      // A 400 means OUR request was invalid (e.g. context length exceeded): the provider is healthy, so it must not
      // open a circuit. Only auth / quota / upstream / network conditions are provider-health signals.
      if (!classified.invalidRequest) {
        markProviderUnhealthy(CLOUDFLARE_EMBEDDINGS_HEALTH_KEY, {
          reason: classified.authFailure ? "cloudflare_unauthorized" : classified.message,
          httpStatus: res.status,
          authFailure: classified.authFailure,
          rateLimited: classified.rateLimited,
        });
      }
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
      markProviderUnhealthy(CLOUDFLARE_EMBEDDINGS_HEALTH_KEY, { reason: message });
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

    recordProviderRequestCompleted(CLOUDFLARE_EMBEDDINGS_HEALTH_KEY, "embeddings", latencyMs);
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

type EmbeddingResult = { vectors: number[][]; model: string } | { error: ClassifiedAiError };

function logEmbeddingPlan(operation: string, plan: EmbeddingPlan): void {
  console.warn(
    "[cloudflare-embeddings] " +
      JSON.stringify({
        event: "input_reduced",
        operation,
        input_texts: plan.inputTexts,
        truncated_texts: plan.truncatedTexts,
        chunks: plan.batches.length,
        estimated_tokens_before: plan.originalEstimatedTokens,
        estimated_tokens_after: plan.plannedEstimatedTokens,
        request_token_budget: plan.limits.requestTokenBudget,
        text_token_cap: plan.limits.textTokenCap,
      }),
  );
}

/**
 * Public entry point. NEVER sends an oversized request: the input is capped per text and split into token-budgeted
 * chunks (in order) BEFORE any provider call, and the reduction is logged. Vectors come back positionally aligned with
 * `input.texts`. The first failing chunk aborts with that error (partial vectors are never returned).
 */
export async function requestCloudflareEmbeddings(input: {
  operation: string;
  texts: string[];
  context?: AiUsageContext;
}): Promise<EmbeddingResult> {
  if (!input.texts.length) return requestEmbeddingChunk(input);
  const plan = planEmbeddingInput(input.texts);
  if (plan.reduced) logEmbeddingPlan(input.operation, plan);

  const vectors: number[][] = new Array(input.texts.length);
  let model = "";
  for (const batch of plan.batches) {
    const r = await requestEmbeddingChunk({ operation: input.operation, texts: batch.texts, context: input.context });
    if ("error" in r) return r;
    model = r.model;
    if (r.vectors.length !== batch.texts.length) {
      return {
        error: { code: "ai_invalid_request", message: "embedding count mismatch for chunk", retryable: false, authFailure: false, invalidRequest: true, rateLimited: false },
      };
    }
    batch.indices.forEach((originalIndex, k) => {
      vectors[originalIndex] = r.vectors[k]!;
    });
  }
  return { vectors, model };
}

async function requestEmbeddingChunk(input: {
  operation: string;
  texts: string[];
  context?: AiUsageContext;
}): Promise<EmbeddingResult> {
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
  if (!isProviderHealthy(CLOUDFLARE_EMBEDDINGS_HEALTH_KEY)) {
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
