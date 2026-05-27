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
import type {
  AiProviderId,
  ChatCompletionRequest,
  ChatCompletionResult,
  ClassifiedAiError,
} from "@/lib/ai/providers/types";

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

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
    process.env.OPENAI_MODEL?.trim() ||
    "openai/gpt-4o-mini"
  );
}

function getProviderConfigs(modelOverride?: string): ProviderConfig[] {
  const configs: ProviderConfig[] = [];
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  if (openaiKey) {
    configs.push({
      id: "openai",
      url: OPENAI_CHAT_URL,
      apiKey: openaiKey,
      model: resolveOpenAiModel(modelOverride),
    });
  }
  const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openrouterKey) {
    configs.push({
      id: "openrouter",
      url: OPENROUTER_CHAT_URL,
      apiKey: openrouterKey,
      model: resolveOpenRouterModel(modelOverride),
      extraHeaders: {
        "HTTP-Referer":
          process.env.OPENROUTER_REFERER?.trim() || "https://newspaper-motion.local",
        "X-Title": process.env.OPENROUTER_APP_NAME?.trim() || "Newspaper Motion",
      },
    });
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
  try {
    const { content, latencyMs } = await withTransientAiRetry({
      operation: request.operation,
      provider: config.id,
      isRetryable: (e) => e.retryable,
      fn: async () => postChat(config, request),
    });
    return { ok: true, content, provider: config.id, latencyMs };
  } catch (err) {
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

/** Try OpenAI → OpenRouter. Returns first success or last failure. */
export async function requestChatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResult> {
  const configs = getProviderConfigs(request.model);
  if (!configs.length) {
    return {
      ok: false,
      provider: "openai",
      latencyMs: 0,
      error: {
        code: "ai_unavailable",
        message: "No AI provider API keys configured",
        retryable: false,
        authFailure: false,
        invalidRequest: false,
        rateLimited: false,
      },
    };
  }

  let lastFailure: ChatCompletionResult | null = null;

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i]!;
    const result = await requestFromProvider(config, request);
    if (result.ok) return result;

    lastFailure = result;
    const next = configs[i + 1];
    if (next) {
      recordProviderFallback(
        config.id,
        next.id,
        result.error.code
      );
    }
  }

  return (
    lastFailure ?? {
      ok: false,
      provider: "openai",
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
  return getProviderConfigs().length > 0;
}

export function isLocalEnrichEnabled(): boolean {
  return process.env.AI_LOCAL_ENRICH_ENABLED !== "false";
}
