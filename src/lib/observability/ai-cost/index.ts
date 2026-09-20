export type {
  OpenAiCallContext,
  OpenAiEndpoint,
  OpenAiUsageDashboard,
  OpenAiUsageRecord,
} from "@/lib/observability/ai-cost/types";

export {
  computeChatCostUsd,
  computeEmbeddingCostUsd,
  computeImageCostUsd,
  computeTtsCostUsd,
  estimateCostUsd,
  isExpensiveModel,
} from "@/lib/observability/ai-cost/pricing";

export {
  estimateTokensFromText,
  hashPrompt,
  parseChatCompletionUsage,
  parseEmbeddingUsage,
} from "@/lib/observability/ai-cost/token-estimate";

export {
  buildUsageRecord,
  logOpenAiUsage,
  recordOpenAiUsage,
} from "@/lib/observability/ai-cost/record";

export { getOpenAiUsageDashboard } from "@/lib/observability/ai-cost/dashboard";
export { getAiFinancialDashboard } from "@/lib/observability/ai-cost/financial-dashboard";
export type { AiFinancialDashboard, MoneyAmount } from "@/lib/observability/ai-cost/financial-dashboard";
export { detectOptimizationOpportunities } from "@/lib/observability/ai-cost/optimization";
export { OPENAI_CALL_SITES } from "@/lib/observability/ai-cost/call-sites";
export {
  recordDirectChatCompletion,
  recordDirectEmbedding,
  recordDirectTts,
} from "@/lib/observability/ai-cost/direct-chat";
export {
  adaptiveTranslationBodySlice,
  classifyEditorialTier,
  editorialMaxTokens,
  translationMaxTokens,
  enrichMaxTokens,
  repairMaxTokens,
  shortsMaxTokens,
} from "@/lib/observability/ai-cost/adaptive-tokens";
export { getExchangeRate, formatDualCurrency, toDualCurrency } from "@/lib/observability/ai-cost/currency";
export { lookupPromptCache, storePromptCache } from "@/lib/observability/ai-cost/prompt-cache";
export { shouldRunEditorialRepair } from "@/lib/observability/ai-cost/repair-policy";
