import { after } from "next/server";
import {
  isProviderHealthy,
  markProviderUnhealthy,
  recordProviderRequestCompleted,
  recordProviderRequestStarted,
} from "@/lib/ai/providers/health";
import { withTransientAiRetry } from "@/lib/ai/providers/retry";
import { acquireConcurrencySlot, reconcileQuotaUsage, reserveQuota } from "@/lib/ai/providers/quota";
import { buildAiUsageRecord, recordAiProviderUsage } from "@/lib/observability/ai-usage/record";
import type { ChatCompletionRequest, ChatCompletionResult, ClassifiedAiError } from "@/lib/ai/providers/types";

export function isCodeCraftConfigured(): boolean {
  return Boolean(process.env.CODECRAFT_API_KEY?.trim());
}

export function resolveCodeCraftModel(operation: string, override?: string): string {
  if (override?.trim()) return override.trim();
  if (operation === "editorial_repair") {
    return process.env.CODECRAFT_REPAIR_MODEL?.trim() || "codecraft-editorial-v1";
  }
  return process.env.CODECRAFT_EDITORIAL_MODEL?.trim() || "codecraft-editorial-v1";
}

function healthKeyFor(model: string): string {
  return `codecraft:${model}`;
}

function classifyCodeCraftFailure(status: number, body: string): ClassifiedAiError {
  let message = `HTTP ${status}`;
  try {
    const json = JSON.parse(body) as { error?: { message?: string; type?: string } };
    message = json.error?.message?.slice(0, 240) || message;
  } catch {}

  if (status === 401 || status === 403) {
    return { code: "ai_unauthorized", message, httpStatus: status, retryable: false, authFailure: true, invalidRequest: false, rateLimited: false };
  }
  if (status === 400) {
    return { code: "ai_invalid_request", message, httpStatus: status, retryable: false, authFailure: false, invalidRequest: true, rateLimited: false };
  }
  if (status === 429 || status === 402) {
    return { code: "ai_quota_exhausted", message, httpStatus: status, retryable: false, authFailure: false, invalidRequest: false, rateLimited: true };
  }
  if (status >= 500) {
    return { code: "ai_upstream_error", message, httpStatus: status, retryable: true, authFailure: false, invalidRequest: false, rateLimited: false };
  }
  return { code: "ai_http_error", message, httpStatus: status, retryable: false, authFailure: false, invalidRequest: false, rateLimited: false };
}

async function postCodeCraft(request: ChatCompletionRequest, model: string): Promise<{ content: string; latencyMs: number; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.CODECRAFT_API_KEY!.trim();
  const baseUrl = process.env.CODECRAFT_BASE_URL?.trim() || "https://codecraftapi.com/v1";
  const started = Date.now();
  recordProviderRequestStarted(healthKeyFor(model), request.operation);

  const controller = new AbortController();
  const timeoutMs = request.timeoutMs ?? 45_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user }
      ],
      temperature: request.temperature ?? 0.35,
      max_tokens: request.maxTokens ?? 1400,
      ...(request.jsonMode ? { response_format: { type: "json_object" } } : {}),
    };

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - started;

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const classified = classifyCodeCraftFailure(res.status, detail);
      markProviderUnhealthy(healthKeyFor(model), {
        reason: classified.authFailure ? "codecraft_unauthorized" : classified.message,
        httpStatus: res.status,
        authFailure: classified.authFailure,
        rateLimited: classified.rateLimited,
      });
      throw classified;
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw { code: "ai_empty_response", message: "Empty CodeCraft response", retryable: false, authFailure: false, invalidRequest: false, rateLimited: false };
    }

    recordProviderRequestCompleted(healthKeyFor(model), request.operation, latencyMs);
    return {
      content,
      latencyMs,
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
    };
  } catch (err) {
    if (err && typeof err === "object" && "retryable" in err && "code" in err) throw err;
    const message = err instanceof Error && err.name === "AbortError" ? "Request timed out" : (err instanceof Error ? err.message.slice(0, 240) : "CodeCraft request failed");
    const retryable = err instanceof Error && err.name === "AbortError";
    throw { code: retryable ? "ai_timeout" : "ai_network_error", message, retryable: true, authFailure: false, invalidRequest: false, rateLimited: false };
  } finally {
    clearTimeout(timer);
  }
}

export async function requestCodeCraftChat(request: ChatCompletionRequest): Promise<ChatCompletionResult> {
  if (!isCodeCraftConfigured()) {
    return { ok: false, provider: "codecraft", latencyMs: 0, error: { code: "ai_unavailable", message: "CODECRAFT_API_KEY not set", retryable: false, authFailure: false, invalidRequest: false, rateLimited: false } };
  }

  const model = resolveCodeCraftModel(request.operation, request.model);

  if (!isProviderHealthy(healthKeyFor(model))) {
    return { ok: false, provider: "codecraft", latencyMs: 0, error: { code: "ai_provider_cooldown", message: `codecraft/${model} temporarily unhealthy`, retryable: false, authFailure: false, invalidRequest: false, rateLimited: false } };
  }

  const quota = await reserveQuota({ provider: "codecraft", model, operation: request.operation, priority: request.priority, estimatedTokens: request.maxTokens });
  if (!quota.allowed) {
    return { ok: false, provider: "codecraft", latencyMs: 0, error: { code: "ai_quota_exhausted", message: quota.reason ?? `codecraft/${model} quota exhausted`, retryable: false, authFailure: false, invalidRequest: false, rateLimited: true } };
  }

  const slot = acquireConcurrencySlot("codecraft");
  if (!slot.acquired) {
    void reconcileQuotaUsage(quota.reservation, { inputTokens: 0, outputTokens: 0 });
    return { ok: false, provider: "codecraft", latencyMs: 0, error: { code: "ai_provider_busy", message: "codecraft concurrency limit reached", retryable: false, authFailure: false, invalidRequest: false, rateLimited: false } };
  }

  const started = Date.now();
  let retryCount = 0;
  try {
    const { content, latencyMs, inputTokens, outputTokens } = await withTransientAiRetry({
      operation: request.operation,
      provider: "codecraft",
      isRetryable: (e) => e.retryable,
      fn: async (attempt) => {
        retryCount = attempt;
        return postCodeCraft(request, model);
      },
    });

    void reconcileQuotaUsage(quota.reservation, { inputTokens, outputTokens });

    after(() =>
      recordAiProviderUsage(
        buildAiUsageRecord({
          provider: "codecraft",
          operation: request.operation,
          endpoint: "chat.completions",
          model,
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
      )
    );

    return { ok: true, content, provider: "codecraft", model, latencyMs };
  } catch (err) {
    const error = err && typeof err === "object" && "code" in err ? (err as ClassifiedAiError) : { code: "ai_network_error", message: "CodeCraft request failed", retryable: true, authFailure: false, invalidRequest: false, rateLimited: false };
    void reconcileQuotaUsage(quota.reservation, { inputTokens: 0, outputTokens: 0 });
    after(() =>
      recordAiProviderUsage(
      buildAiUsageRecord({
        provider: "codecraft",
        operation: request.operation,
        endpoint: "chat.completions",
        model,
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
      )
    );
    return { ok: false, provider: "codecraft", latencyMs: Date.now() - started, error };
  } finally {
    slot.release();
  }
}
