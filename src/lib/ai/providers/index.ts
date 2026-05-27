export type {
  AiProviderHealthSnapshot,
  AiProviderId,
  ChatCompletionRequest,
  ChatCompletionResult,
  ClassifiedAiError,
} from "@/lib/ai/providers/types";

export {
  classifyAiHttpFailure,
  classifyAiNetworkError,
  parseOpenAiErrorBody,
} from "@/lib/ai/providers/errors";

export {
  getAiProviderHealthSnapshots,
  getAiProviderHealthSummary,
  isProviderHealthy,
  logProviderTelemetry,
  markProviderUnhealthy,
  recordProviderFallback,
} from "@/lib/ai/providers/health";

export { enrichArticleLocally } from "@/lib/ai/providers/local-enrich";

export {
  isAnyChatProviderConfigured,
  isLocalEnrichEnabled,
  requestChatCompletion,
} from "@/lib/ai/providers/chat";

export { requestImageGeneration } from "@/lib/ai/providers/images";
