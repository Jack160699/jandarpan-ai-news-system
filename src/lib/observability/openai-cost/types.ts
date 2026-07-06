export type OpenAiEndpoint =
  | "chat.completions"
  | "embeddings"
  | "images.generations"
  | "audio.speech";

export type OpenAiCallContext = {
  worker?: string;
  cron?: string;
  articleId?: string;
  eventId?: string;
  tenantId?: string;
  retryCount?: number;
};

export type OpenAiUsageRecord = {
  operation: string;
  endpoint: OpenAiEndpoint;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  estimatedCostUsd: number;
  latencyMs?: number;
  retryCount?: number;
  success: boolean;
  promptHash?: string;
  promptChars?: number;
  completionChars?: number;
  metadata?: Record<string, unknown>;
} & OpenAiCallContext;

export type OpenAiUsageDashboard = {
  todaySpendUsd: number;
  yesterdaySpendUsd: number;
  last7DaysSpendUsd: number;
  last30DaysSpendUsd: number;
  costByWorker: Array<{ worker: string; costUsd: number; requests: number }>;
  costByModel: Array<{ model: string; costUsd: number; requests: number }>;
  costByArticle: Array<{ articleId: string; costUsd: number; requests: number }>;
  avgTokensPerRequest: { input: number; output: number };
  largestPromptToday: {
    operation: string;
    inputTokens: number;
    promptChars: number | null;
    articleId: string | null;
    createdAt: string;
  } | null;
  largestCompletionToday: {
    operation: string;
    outputTokens: number;
    completionChars: number | null;
    articleId: string | null;
    createdAt: string;
  } | null;
  mostExpensiveArticle: {
    articleId: string;
    costUsd: number;
    requests: number;
  } | null;
  mostExpensiveWorker: {
    worker: string;
    costUsd: number;
    requests: number;
  } | null;
  retryCostUsd: number;
  duplicateWorkDetected: Array<{
    promptHash: string;
    count: number;
    totalCostUsd: number;
    operations: string[];
  }>;
  topExpensiveRequests: Array<{
    id: string;
    operation: string;
    worker: string | null;
    model: string;
    articleId: string | null;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    createdAt: string;
    retryCount: number;
  }>;
  optimizationOpportunities: Array<{
    id: string;
    category: string;
    description: string;
    estimatedMonthlySavingsUsd: number;
    evidence: Record<string, unknown>;
  }>;
  totalRequests: number;
  instrumentedSince: string | null;
};
