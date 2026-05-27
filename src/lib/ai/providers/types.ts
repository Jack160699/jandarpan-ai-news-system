export type AiProviderId = "openai" | "openrouter" | "local";
export type OpenAiProviderStatus =
  | "healthy"
  | "degraded"
  | "unauthorized"
  | "fallback_only";

export type ProviderTelemetryPhase =
  | "provider_request_started"
  | "provider_request_completed"
  | "provider_request_failed"
  | "provider_fallback_triggered";

export type AiProviderHealthSnapshot = {
  provider: AiProviderId;
  healthy: boolean;
  disabledUntil: string | null;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveFailures: number;
  totalRequests: number;
  totalSuccess: number;
  totalFailure: number;
  lastLatencyMs: number;
  lastError: string | null;
  lastHttpStatus: number | null;
};

export type ClassifiedAiError = {
  code: string;
  message: string;
  httpStatus?: number;
  retryable: boolean;
  authFailure: boolean;
  invalidRequest: boolean;
  rateLimited: boolean;
};

export type ChatCompletionRequest = {
  operation: string;
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
};

export type ChatCompletionResult =
  | { ok: true; content: string; provider: AiProviderId; latencyMs: number }
  | {
      ok: false;
      error: ClassifiedAiError;
      provider: AiProviderId;
      latencyMs: number;
    };
