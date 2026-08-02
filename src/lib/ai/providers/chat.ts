/**
 * Resilient chat completions — OpenAI primary, OpenRouter secondary, retries on transient errors only.
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
  recordProviderFallback,
} from "@/lib/ai/providers/health";
import { withTransientAiRetry } from "@/lib/ai/providers/retry";
import { acquireConcurrencySlot, checkAndConsumeQuota } from "@/lib/ai/providers/quota";
import { isGeminiConfigured, requestGeminiChat } from "@/lib/ai/providers/gemini";
import { resolveChatChain } from "@/lib/ai/providers/router";
import {
  buildUsageRecord,
  logOpenAiUsage,
  parseChatCompletionUsage,
} from "@/lib/observability/openai-cost";
import { buildAiUsageRecord, logAiProviderUsage } from "@/lib/observability/ai-usage/record";
import {
  lookupPromptCache,
  storePromptCache,
} from "@/lib/observability/openai-cost/prompt-cache";
import { allowsPromptCache } from "@/lib/ai/providers/chat-cache-policy";
import type {
  AiProviderId,
  ChatCompletionRequest,
  ChatCompletionResult,
  ClassifiedAiError,
} from "@/lib/ai/providers/types";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

type ProviderConfig = {
  id: AiProviderId;
  url: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
};

function resolveOpenAiModel(override?: string): string {
  return (
    override?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini"
  );
}

function resolveOpenRouterModel(override?: string): string {
  return (
    override?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    "meta-llama/llama-3.1-8b-instruct:free"
  );
}

function resolveGroqModel(operation: string, override?: string): string {
  if (override?.trim()) return override.trim();
  if (operation === "editorial_review") {
    return process.env.GROQ_REVIEW_MODEL?.trim() || "llama-3.3-70b-versatile";
  }
  return process.env.GROQ_LIGHTWEIGHT_MODEL?.trim() || "llama-3.1-8b-instant";
}

/** REST configs for the OpenAI-compatible providers (openai, openrouter, groq) — excludes gemini, which has its own request shape (see gemini.ts). */
function getRestProviderConfigs(operation: string, modelOverride?: string): Partial<Record<AiProviderId, ProviderConfig>> {
  const configs: Partial<Record<AiProviderId, ProviderConfig>> = {};
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    configs.openai = {
      id: "openai",
      url: OPENAI_CHAT_URL,
      apiKey: openaiKey,
      model: resolveOpenAiModel(modelOverride),
    };
  }
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey) {
    configs.openrouter = {
      id: "openrouter",
      url: OPENROUTER_CHAT_URL,
      apiKey: openrouterKey,
      model: resolveOpenRouterModel(modelOverride),
      extraHeaders: {
        "HTTP-Referer":
          process.env.OPENROUTER_REFERER?.trim() || "https://newspaper-motion.local",
        "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "Newspaper Motion",
      },
    };
  }
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    configs.groq = {
      id: "groq",
      url: GROQ_CHAT_URL,
      apiKey: groqKey,
      model: resolveGroqModel(operation, modelOverride),
    };
  }
  return configs;
}

async function postChat(
  config: ProviderConfig,
  request: ChatCompletionRequest
): Promise<{ content: string; latencyMs: number }> {
  const started = Date.now();
  recordProviderRequestStarted(config.id, request.operation);

  const controller = new AbortController();
  const timeoutMs = request.timeoutMs ?? 45_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: request.system },
      { role: "user", content: request.user },
    ];

    const body: Record<string, unknown> = {
      model: request.model ?? config.model,
      temperature: request.temperature ?? 0.35,
      max_tokens: request.maxTokens ?? 1400,
      messages,
    };
    if (request.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(config.url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...config.extraHeaders,
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - started;

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const classified = classifyAiHttpFailure(res.status, detail);
      markProviderUnhealthy(config.id, {
        reason: classified.authFailure
          ? `${config.id}_unauthorized`
          : classified.message,
        httpStatus: res.status,
        authFailure: classified.authFailure,
        rateLimited: classified.rateLimited,
      });
      throw classified;
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: Record<string, unknown>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) {
      const empty: ClassifiedAiError = {
        code: "ai_empty_response",
        message: "Empty model response",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      };
      throw empty;
    }

    recordProviderRequestCompleted(config.id, request.operation, latencyMs);

    const usage = parseChatCompletionUsage(json);
    if (config.id === "openai") {
      // Legacy table stays OpenAI-only for backward-compatible dashboard continuity.
      logOpenAiUsage(
        buildUsageRecord({
          operation: request.operation,
          endpoint: "chat.completions",
          model: request.model ?? config.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          cachedTokens: usage.cachedTokens,
          latencyMs,
          success: true,
          system: request.system,
          user: request.user,
          completion: content,
          context: request.context,
          metadata: { provider: config.id },
        })
      );
    }
    logAiProviderUsage(
      buildAiUsageRecord({
        provider: config.id,
        operation: request.operation,
        endpoint: "chat.completions",
        model: request.model ?? config.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedTokens: usage.cachedTokens,
        latencyMs,
        success: true,
        system: request.system,
        user: request.user,
        completion: content,
        context: request.context,
      })
    );

    if (allowsPromptCache(request.cachePolicy)) {
      void storePromptCache({
        system: request.system,
        user: request.user,
        operation: request.operation,
        worker: request.context?.worker ?? request.operation,
        articleId: request.context?.articleId,
        eventId: request.context?.eventId,
        model: request.model ?? config.model,
        result: content,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        estimatedCostUsd: buildUsageRecord({
          operation: request.operation,
          endpoint: "chat.completions",
          model: request.model ?? config.model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          success: true,
        }).estimatedCostUsd,
      });
    }

    return { content, latencyMs };
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "retryable" in err &&
      "code" in err
    ) {
      throw err;
    }
    throw classifyAiNetworkError(err);
  } finally {
    clearTimeout(timer);
  }
}

async function requestFromProvider(
  config: ProviderConfig,
  request: ChatCompletionRequest
): Promise<ChatCompletionResult> {
  if (!isProviderHealthy(config.id)) {
    return {
      ok: false,
      provider: config.id,
      latencyMs: 0,
      error: {
        code: "ai_provider_cooldown",
        message: `${config.id} temporarily unhealthy`,
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    };
  }

  const started = Date.now();
  const retryCount = 0;

  const worker = request.context?.worker ?? request.operation;
  if (allowsPromptCache(request.cachePolicy)) {
    const cached = await lookupPromptCache({
      system: request.system,
      user: request.user,
      operation: request.operation,
      worker,
      articleId: request.context?.articleId,
      eventId: request.context?.eventId,
    });
    if (cached.hit && cached.result) {
      return { ok: true, content: cached.result, provider: config.id, latencyMs: 0 };
    }
  }

  // OpenAI has no quota controller (billing is disabled by default — see
  // AI_PROVIDER_OPENAI_ENABLED); the free providers are quota-gated.
  if (config.id !== "openai") {
    const quota = await checkAndConsumeQuota({
      provider: config.id,
      operation: request.operation,
      estimatedTokens: request.maxTokens,
    });
    if (!quota.allowed) {
      return {
        ok: false,
        provider: config.id,
        latencyMs: 0,
        error: {
          code: "ai_quota_exhausted",
          message: quota.reason ?? `${config.id} quota exhausted`,
          retryable: false,
          authFailure: false,
          invalidRequest: false,
          rateLimited: true,
        },
      };
    }
    const slot = acquireConcurrencySlot(config.id);
    if (!slot.acquired) {
      return {
        ok: false,
        provider: config.id,
        latencyMs: 0,
        error: {
          code: "ai_provider_busy",
          message: `${config.id} concurrency limit reached`,
          retryable: false,
          authFailure: false,
          invalidRequest: false,
          rateLimited: false,
        },
      };
    }
    try {
      return await requestFromProviderInner(config, request, started, retryCount);
    } finally {
      slot.release();
    }
  }

  return requestFromProviderInner(config, request, started, retryCount);
}

async function requestFromProviderInner(
  config: ProviderConfig,
  request: ChatCompletionRequest,
  started: number,
  retryCountInit: number
): Promise<ChatCompletionResult> {
  let retryCount = retryCountInit;
  try {
    const { content, latencyMs } = await withTransientAiRetry({
      operation: request.operation,
      provider: config.id,
      isRetryable: (e) => e.retryable,
      fn: async (attempt) => {
        retryCount = attempt;
        return postChat(config, request);
      },
    });
    return { ok: true, content, provider: config.id, latencyMs };
  } catch (err) {
    const errorCode =
      err && typeof err === "object" && "code" in err
        ? (err as ClassifiedAiError).code
        : "unknown";
    if (config.id === "openai") {
      logOpenAiUsage(
        buildUsageRecord({
          operation: request.operation,
          endpoint: "chat.completions",
          model: request.model ?? config.model,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - started,
          retryCount,
          success: false,
          system: request.system,
          user: request.user,
          context: request.context,
          metadata: { provider: config.id, error: errorCode },
        })
      );
    }
    logAiProviderUsage(
      buildAiUsageRecord({
        provider: config.id,
        operation: request.operation,
        endpoint: "chat.completions",
        model: request.model ?? config.model,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: Date.now() - started,
        retryCount,
        success: false,
        system: request.system,
        user: request.user,
        context: request.context,
        fallbackReason: errorCode,
      })
    );
    const error =
      err && typeof err === "object" && "code" in err
        ? (err as ClassifiedAiError)
        : classifyAiNetworkError(err);
    return {
      ok: false,
      provider: config.id,
      latencyMs: Date.now() - started,
      error,
    };
  }
}

/**
 * Free-first chat completion. Provider order comes from router.ts's
 * operation->chain mapping (gemini/groq first by default; OpenAI only
 * appears when AI_PROVIDER_OPENAI_ENABLED=true). Returns first success or
 * the last failure across the chain.
 */
export async function requestChatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResult> {
  const chain = resolveChatChain(request.operation);
  const restConfigs = getRestProviderConfigs(request.operation, request.model);

  const attempts: Array<{ id: AiProviderId; invoke: () => Promise<ChatCompletionResult> }> = [];
  for (const providerId of chain) {
    if (providerId === "gemini") {
      if (isGeminiConfigured()) attempts.push({ id: "gemini", invoke: () => requestGeminiChat(request) });
      continue;
    }
    const config = restConfigs[providerId];
    if (config) attempts.push({ id: providerId, invoke: () => requestFromProvider(config, request) });
  }

  if (!attempts.length) {
    return {
      ok: false,
      provider: "gemini",
      latencyMs: 0,
      error: {
        code: "ai_unavailable",
        message: "No AI provider API keys configured for this operation",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    };
  }

  let lastFailure: ChatCompletionResult | null = null;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i]!;
    const result = await attempt.invoke();
    if (result.ok) return result;

    lastFailure = result;
    const next = attempts[i + 1];
    if (next) {
      recordProviderFallback(attempt.id, next.id, result.error.code);
    }
  }

  return (
    lastFailure ?? {
      ok: false,
      provider: "gemini",
      latencyMs: 0,
      error: {
        code: "ai_unavailable",
        message: "All providers failed",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    }
  );
}

export function isAnyChatProviderConfigured(): boolean {
  return (
    isGeminiConfigured() ||
    Object.keys(getRestProviderConfigs("editorial_generate")).length > 0
  );
}

export { isLocalEnrichEnabled } from "@/lib/ai/providers/local-enrich-flag";
