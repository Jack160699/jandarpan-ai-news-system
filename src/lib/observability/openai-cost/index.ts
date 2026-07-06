export type {
  OpenAiCallContext,
  OpenAiEndpoint,
  OpenAiUsageDashboard,
  OpenAiUsageRecord,
} from "@/lib/observability/openai-cost/types";

export {
  computeChatCostUsd,
  computeEmbeddingCostUsd,
  computeImageCostUsd,
  computeTtsCostUsd,
  estimateCostUsd,
  isExpensiveModel,
} from "@/lib/observability/openai-cost/pricing";

export {
  estimateTokensFromText,
  hashPrompt,
  parseChatCompletionUsage,
  parseEmbeddingUsage,
} from "@/lib/observability/openai-cost/token-estimate";

export {
  buildUsageRecord,
  logOpenAiUsage,
  recordOpenAiUsage,
} from "@/lib/observability/openai-cost/record";

export { getOpenAiUsageDashboard } from "@/lib/observability/openai-cost/dashboard";
export { getAiFinancialDashboard } from "@/lib/observability/openai-cost/financial-dashboard";
export type { AiFinancialDashboard, MoneyAmount } from "@/lib/observability/openai-cost/financial-dashboard";
export { detectOptimizationOpportunities } from "@/lib/observability/openai-cost/optimization";
export { OPENAI_CALL_SITES } from "@/lib/observability/openai-cost/call-sites";
export {
  recordDirectChatCompletion,
  recordDirectEmbedding,
  recordDirectTts,
} from "@/lib/observability/openai-cost/direct-chat";
export {
  adaptiveTranslationBodySlice,
  classifyEditorialTier,
  editorialMaxTokens,
  translationMaxTokens,
  enrichMaxTokens,
  repairMaxTokens,
  shortsMaxTokens,
} from "@/lib/observability/openai-cost/adaptive-tokens";
export { getExchangeRate, formatDualCurrency, toDualCurrency } from "@/lib/observability/openai-cost/currency";
export { lookupPromptCache, storePromptCache } from "@/lib/observability/openai-cost/prompt-cache";
export { shouldRunEditorialRepair } from "@/lib/observability/openai-cost/repair-policy";
