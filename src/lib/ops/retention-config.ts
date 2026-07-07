/**
 * Data retention tunables — env-driven TTLs for automated cleanup.
 */

export const RETENTION_CONFIG = {
  /** Delete news_signals not referenced by news_events after N days */
  newsSignalsDays: Number(process.env.RETENTION_NEWS_SIGNALS_DAYS) || 30,
  /** Trim ingestion_logs / ingestion_failures */
  ingestionLogsDays: Number(process.env.RETENTION_INGESTION_LOGS_DAYS) || 14,
  /** ops_error_events resolved + all older than N days */
  opsErrorEventsDays: Number(process.env.RETENTION_OPS_ERRORS_DAYS) || 30,
  /** ops_cron_runs heartbeat history */
  opsCronRunsDays: Number(process.env.RETENTION_OPS_CRON_RUNS_DAYS) || 14,
  /** worker_job_runs execution traces */
  workerJobRunsDays: Number(process.env.RETENTION_WORKER_JOB_RUNS_DAYS) || 7,
  /** Delivered/failed event_bus_messages */
  eventBusDays: Number(process.env.RETENTION_EVENT_BUS_DAYS) || 7,
  /** queue_cleanup_archive rows */
  queueCleanupArchiveDays: Number(process.env.RETENTION_QUEUE_ARCHIVE_DAYS) || 14,
  /** openai_usage_events cost telemetry */
  openaiUsageEventsDays: Number(process.env.RETENTION_OPENAI_USAGE_DAYS) || 30,
  /** Expired openai_prompt_cache rows (also purged by expires_at) */
  openaiPromptCacheDays: Number(process.env.RETENTION_PROMPT_CACHE_DAYS) || 7,
  /** Auto-archive published generated_articles after N days (unpinned only) */
  publishedArticleArchiveDays:
    Number(process.env.RETENTION_PUBLISHED_ARTICLE_DAYS) || 90,
  /** Max history entries per source_reputation_memory row */
  reputationHistoryMax:
    Number(process.env.RETENTION_REPUTATION_HISTORY_MAX) || 24,
  /** Rows deleted per table per retention run */
  batchSize: Number(process.env.RETENTION_BATCH_SIZE) || 500,
  /** Max storage objects audited per run (orphan detection) */
  storageAuditLimit: Number(process.env.RETENTION_STORAGE_AUDIT_LIMIT) || 200,
} as const;

export function retentionCutoffIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}
