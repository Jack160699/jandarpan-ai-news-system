/**
 * Google Gemini chat-completion adapter — free-tier primary editorial writer.
 * Gemini's generateContent REST shape differs from the OpenAI-compatible
 * providers handled in chat.ts, so it gets its own request/response mapping,
 * but plugs into the same health registry, retry policy, quota controller,
 * and ChatCompletionResult contract so callers can't tell the difference.
 */

import {
  isProviderHealthy,
  markProviderUnhealthy,
  recordProviderRequestCompleted,
  recordProviderRequestStarted,
} from "@/lib/ai/providers/health";
import { withTransientAiRetry } from "@/lib/ai/providers/retry";
import { acquireConcurrencySlot, reconcileQuotaUsage, reserveQuota } from "@/lib/ai/providers/quota";
import { buildAiUsageRecord, logAiProviderUsage } from "@/lib/observability/ai-usage/record";
import type { ChatCompletionRequest, ChatCompletionResult, ClassifiedAiError } from "@/lib/ai/providers/types";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

/**
 * Current stable defaults as of Aug 2026 (Gemini 3.6 Flash / 3.5 Flash-Lite
 * GA — see the manual setup notes for sourcing). Always prefer the explicit
 * env var over these fallbacks so a future model rename doesn't require a
 * code change: set GEMINI_EDITORIAL_MODEL / GEMINI_TRANSLATION_MODEL /
 * GEMINI_LIGHTWEIGHT_MODEL rather than relying on this function's defaults.
 */
function resolveGeminiModel(operation: string, override?: string): string {
  if (override?.trim()) return override.trim();
  if (operation === "translation") {
    return process.env.GEMINI_TRANSLATION_MODEL?.trim() || process.env.GEMINI_EDITORIAL_MODEL?.trim() || "gemini-3.5-flash-lite";
  }
  if (operation === "classification_lightweight" || operation === "schema_repair") {
    return process.env.GEMINI_LIGHTWEIGHT_MODEL?.trim() || "gemini-3.5-flash-lite";
  }
  return process.env.GEMINI_EDITORIAL_MODEL?.trim() || "gemini-3.6-flash";
}

function classifyGeminiFailure(status: number, body: string): ClassifiedAiError {
  let message = `HTTP ${status}`;
  let apiStatus: string | undefined;
  try {
    const json = JSON.parse(body) as { error?: { message?: string; status?: string } };
    message = json.error?.message?.slice(0, 240) || message;
    apiStatus = json.error?.status;
  } catch {
    // non-JSON body, keep default message
  }

  if (status === 401 || status === 403 || apiStatus === "UNAUTHENTICATED" || apiStatus === "PERMISSION_DENIED") {
    return { code: "ai_unauthorized", message, httpStatus: status, retryable: false, authFailure: true, invalidRequest: false, rateLimited: false };
  }
  if (status === 400 || apiStatus === "INVALID_ARGUMENT") {
    return { code: "ai_invalid_request", message, httpStatus: status, retryable: false, authFailure: false, invalidRequest: true, rateLimited: false };
  }
  if (status === 429 || apiStatus === "RESOURCE_EXHAUSTED") {
    return { code: "ai_quota_exhausted", message, httpStatus: status, retryable: false, authFailure: false, invalidRequest: false, rateLimited: true };
  }
  if (status >= 500 || apiStatus === "UNAVAILABLE") {
    return { code: "ai_upstream_error", message, httpStatus: status, retryable: true, authFailure: false, invalidRequest: false, rateLimited: false };
  }
  return { code: "ai_http_error", message, httpStatus: status, retryable: false, authFailure: false, invalidRequest: false, rateLimited: false };
}

async function postGemini(request: ChatCompletionRequest): Promise<{ content: string; latencyMs: number; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.GEMINI_API_KEY!.trim();
  const model = resolveGeminiModel(request.operation, request.model);
  const started = Date.now();
  recordProviderRequestStarted("gemini", request.operation);

  const controller = new AbortController();
  const timeoutMs = request.timeoutMs ?? 45_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, unknown> = {
      system_instruction: { parts: [{ text: request.system }] },
      contents: [{ role: "user", parts: [{ text: request.user }] }],
      generationConfig: {
        temperature: request.temperature ?? 0.35,
        maxOutputTokens: request.maxTokens ?? 1400,
        ...(request.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    };

    const res = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - started;

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const classified = classifyGeminiFailure(res.status, detail);
      markProviderUnhealthy("gemini", {
        reason: classified.authFailure ? "gemini_unauthorized" : classified.message,
        httpStatus: res.status,
        authFailure: classified.authFailure,
        rateLimited: classified.rateLimited,
      });
      throw classified;
    }

    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const content = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    if (!content) {
      const empty: ClassifiedAiError = { code: "ai_empty_response", message: "Empty Gemini response", retryable: false, authFailure: false, invalidRequest: false, rateLimited: false };
      throw empty;
    }

    recordProviderRequestCompleted("gemini", request.operation, latencyMs);
    return {
      content,
      latencyMs,
      inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
    };
  } catch (err) {
    if (err && typeof err === "object" && "retryable" in err && "code" in err) throw err;
    const message = err instanceof Error && err.name === "AbortError" ? "Request timed out" : (err instanceof Error ? err.message.slice(0, 240) : "Gemini request failed");
    const retryable = err instanceof Error && err.name === "AbortError";
    const network: ClassifiedAiError = { code: retryable ? "ai_timeout" : "ai_network_error", message, retryable: true, authFailure: false, invalidRequest: false, rateLimited: false };
    throw network;
  } finally {
    clearTimeout(timer);
  }
}

export async function requestGeminiChat(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
  if (!isGeminiConfigured()) {
    return { ok: false, provider: "gemini", latencyMs: 0, error: { code: "ai_unavailable", message: "GEMINI_API_KEY not set", retryable: false, authFailure: false, invalidRequest: false, rateLimited: false } };
  }
  if (!isProviderHealthy("gemini")) {
    return { ok: false, provider: "gemini", latencyMs: 0, error: { code: "ai_provider_cooldown", message: "gemini temporarily unhealthy", retryable: false, authFailure: false, invalidRequest: false, rateLimited: false } };
  }

  const quota = await reserveQuota({ provider: "gemini", operation: request.operation, estimatedTokens: request.maxTokens });
  if (!quota.allowed) {
    return { ok: false, provider: "gemini", latencyMs: 0, error: { code: "ai_quota_exhausted", message: quota.reason ?? "gemini quota exhausted", retryable: false, authFailure: false, invalidRequest: false, rateLimited: true } };
  }

  const slot = acquireConcurrencySlot("gemini");
  if (!slot.acquired) {
    return { ok: false, provider: "gemini", latencyMs: 0, error: { code: "ai_provider_busy", message: "gemini concurrency limit reached", retryable: false, authFailure: false, invalidRequest: false, rateLimited: false } };
  }

  const started = Date.now();
  let retryCount = 0;
  try {
    const { content, latencyMs, inputTokens, outputTokens } = await withTransientAiRetry({
      operation: request.operation,
      provider: "gemini",
      isRetryable: (e) => e.retryable,
      fn: async (attempt) => {
        retryCount = attempt;
        return postGemini(request);
      },
    });

    void reconcileQuotaUsage(quota.reservation, { inputTokens, outputTokens });

    logAiProviderUsage(
      buildAiUsageRecord({
        provider: "gemini",
        operation: request.operation,
        endpoint: "generateContent",
        model: resolveGeminiModel(request.operation, request.model),
        inputTokens,
        outputTokens,
        latencyMs,
        retryCount,
        success: true,
        system: request.system,
        user: request.user,
        completion: content,
        context: request.context,
      })
    );

    return { ok: true, content, provider: "gemini", latencyMs };
  } catch (err) {
    const error = err && typeof err === "object" && "code" in err ? (err as ClassifiedAiError) : { code: "ai_network_error", message: "Gemini request failed", retryable: true, authFailure: false, invalidRequest: false, rateLimited: false };
    // No real tokens were consumed — give the reserved estimate back.
    void reconcileQuotaUsage(quota.reservation, { inputTokens: 0, outputTokens: 0 });
    logAiProviderUsage(
      buildAiUsageRecord({
        provider: "gemini",
        operation: request.operation,
        endpoint: "generateContent",
        model: resolveGeminiModel(request.operation, request.model),
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        retryCount,
        success: false,
        system: request.system,
        user: request.user,
        context: request.context,
        fallbackReason: error.code,
      })
    );
    return { ok: false, provider: "gemini", latencyMs: Date.now() - started, error };
  } finally {
    slot.release();
  }
}
