/**
 * Production newsroom tunables — Vercel-safe defaults
 */

export const INFRA_CONFIG = {
  /** Serverless budget before soft stop (ms) */
  ingestBudgetMs: Number(process.env.INGEST_BUDGET_MS) || 52_000,
  ingestStopRatio: Number(process.env.INGEST_STOP_RATIO) || 0.82,

  providerFetchTimeoutMs:
    Number(process.env.PROVIDER_FETCH_TIMEOUT_MS) || 8_000,
  providerMaxRetries: Number(process.env.PROVIDER_MAX_RETRIES) || 2,
  providerRetryBaseMs: Number(process.env.PROVIDER_RETRY_BASE_MS) || 400,

  rssBatchSize: Number(process.env.RSS_BATCH_SIZE) || 4,

  aiQueueBatch: Number(process.env.AI_QUEUE_BATCH) || 10,
  editorialBatchLimit: Number(process.env.EDITORIAL_BATCH_LIMIT) || 6,
  editorialConcurrency: Math.min(
    4,
    Math.max(1, Number(process.env.EDITORIAL_CONCURRENCY) || 2)
  ),
  imageQueueBatch: Number(process.env.IMAGE_QUEUE_BATCH) || 5,

  homepageCacheSeconds: Number(process.env.HOMEPAGE_CACHE_SECONDS) || 60,
  apiEdgeCacheSeconds: Number(process.env.API_EDGE_CACHE_SECONDS) || 30,

  redisEnabled: Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  ),

  cronOrchestrateEnabled:
    process.env.CRON_ORCHESTRATE_ENABLED !== "false",

  /** Observability */
  sentryEnabled: Boolean(process.env.SENTRY_DSN?.trim()),
  dashboardCacheTtlSec: Number(process.env.DASHBOARD_CACHE_TTL_SEC) || 45,
  intelligenceCacheTtlSec: Number(process.env.INTELLIGENCE_CACHE_TTL_SEC) || 60,
  analyticsCacheTtlSec: Number(process.env.ANALYTICS_CACHE_TTL_SEC) || 120,
  apiRateLimitPerMinute: Number(process.env.API_RATE_LIMIT_PER_MINUTE) || 120,

  workerJobBatch: Number(process.env.WORKER_JOB_BATCH) || 8,
  damAnalyzeBatch: Number(process.env.DAM_ANALYZE_BATCH) || 4,
  intelligenceWorkersEnabled:
    process.env.INTELLIGENCE_WORKERS_ENABLED !== "false",
} as const;
