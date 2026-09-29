/** Shapes returned by public.admin_ops_snapshot() (migration 086). */

import type { IngestionHealthState } from "@/lib/news/ingestion/source-state";

export type Tone = "healthy" | "warning" | "critical";

export type FunnelCounts = {
  fetched: number;
  normalized: number;
  duplicates_removed: number;
  signals_inserted: number;
  geo_classified: number;
  clustered_events: number;
  editorial_candidates: number;
  ai_generated: number;
  qa_passed: number;
  published: number;
};

export type ArticlePerfRow = {
  id: string;
  slug: string;
  headline: string;
  language: string | null;
  published_at: string;
  district: string | null;
  scope: string | null;
  source: string | null;
  views_24h: number;
  likes_24h: number;
  comments_24h: number;
  views_7d: number;
  likes_7d: number;
  comments_7d: number;
  views_total: number;
  likes_total: number;
  comments_total: number;
  engagement_24h?: number;
  engagement_rate_24h?: number | null;
};

export type CronJobRow = {
  job: string;
  last_run_at: string | null;
  last_ok: boolean | null;
  last_duration_ms: number | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  runs_24h: number;
  failures_24h: number;
  degraded_24h: number;
};

export type SourceStateRow = {
  source_key: string;
  provider_family: string;
  enabled: boolean;
  health_state: IngestionHealthState;
  last_attempted_at: string | null;
  last_successful_at: string | null;
  last_new_item_at: string | null;
  last_item_timestamp: string | null;
  consecutive_failures: number;
  consecutive_empty_runs: number;
  disabled_until: string | null;
  quota_exhausted_until: string | null;
  rate_limited_until: string | null;
  retirement_reason: string | null;
  last_error_category: string | null;
};

export type VoiceSnapshot = {
  by_status: Record<string, number>;
  last_24h: {
    generated: number;
    failed: number;
    characters: number;
    estimated_cost_usd: number;
    avg_latency_ms: number | null;
    avg_duration_ms: number | null;
  };
  by_provider_24h: Array<{
    provider: string;
    voice_model: string;
    ready: number;
    failed: number;
    avg_latency_ms: number | null;
    cost_usd: number | null;
  }>;
  failure_reasons: Array<{ reason: string; n: number }>;
  recent: Array<{
    id: string;
    article_id: string;
    headline: string;
    language: string;
    script_kind: string;
    style: string;
    status: string;
    provider: string | null;
    voice_model: string;
    voice_name: string;
    duration_ms: number | null;
    latency_ms: number | null;
    characters: number | null;
    attempts: number;
    error: string | null;
    updated_at: string;
  }>;
  pending_articles: number;
};

export type VoiceSampleView = {
  name: string;
  label: string;
  ok: boolean;
  provider?: string;
  model?: string;
  voiceName?: string;
  latencyMs?: number;
  durationMs?: number | null;
  characters?: number;
  estimatedCostUsd?: number;
  fallbackUsed?: boolean;
  storagePath?: string;
  error?: string;
  validationFailures?: string[];
};

export type OpsSnapshotRaw = {
  generated_at: string;
  day_start: string;
  pg_cron_installed: boolean;
  users: {
    total: number;
    new_today: number;
    new_7d: number;
    new_30d: number;
    active_today: number;
    active_7d: number;
    active_30d: number;
    returning_30d: number;
  };
  publishing: {
    target: number;
    today: number;
    last_1h: number;
    last_6h: number;
    last_24h: number;
    last_7d: number;
    latest: { id: string; slug: string; headline: string; published_at: string; language: string | null } | null;
    by_day: Array<{ day: string; n: number }>;
    by_hour_today: Array<{ hour: number; n: number }>;
    pending_review: number;
    today_without_image?: number;
    today_with_image?: number;
    ist_hour_now: number;
    ist_minute_now: number;
  };
  signals: {
    today: number;
    last_1h: number;
    last_24h: number;
    by_provider_today: Record<string, number>;
    stale_at_ingest_24h: number;
  };
  queue: {
    ai_queue: Record<string, number>;
    ai_queue_oldest_pending: string | null;
    worker_jobs: Array<{ job_type: string; status: string; n: number }>;
    events_awaiting_article: number;
    events_36h: number;
  };
  funnel: { last_1h: FunnelCounts; today: FunnelCounts; last_24h: FunnelCounts };
  sources: {
    state: SourceStateRow[];
    today: Array<{ source: string; fetched: number; new_items: number; duplicates: number; rejected: number; failures: number }>;
    ingest_runs_24h: Array<{ status: string; n: number; avg_ms: number | null; inserted: number | null; duplicates: number | null }>;
    provider_errors_24h: Array<{ error: string; n: number }>;
  };
  geo: {
    scope_today: Record<string, number>;
    scope_24h: Record<string, number>;
    districts: Array<{ district: string; today: number; last_7d: number; latest_at: string | null }>;
    legacy_unverified_district_rows: number;
    signals_scope_24h: Record<string, number>;
  };
  language: {
    today: Record<string, number>;
    script_mismatch_published: number;
    gate_failures_24h: number;
    gate_failure_codes_24h: Record<string, number>;
    untranslated_today: number;
    cross_language_duplicates: number | null;
  };
  failures: {
    editorial_skip_reasons_24h: Array<{ reason: string; n: number }>;
    ai_queue_reasons: Array<{ status: string; reason: string; n: number }>;
    dead_jobs: Array<{ job_type: string; reason: string; n: number }>;
    cron_failures_24h: Array<{ job: string; n: number; last_error: string }>;
    ai_failures_24h: Array<{ provider: string; model: string; reason: string; n: number }>;
  };
  performance: {
    top_views_24h: ArticlePerfRow[];
    top_engagement_24h: ArticlePerfRow[];
    top_views_7d: ArticlePerfRow[];
    top_total: ArticlePerfRow[];
    excluded_non_article_ids: number;
  };
  ai: {
    circuit: Array<{
      key: string;
      disabled_until: string | null;
      consecutive_failures: number;
      last_error: string | null;
      last_failure_at: string | null;
      last_success_at: string | null;
      failure_class: string | null;
      updated_at: string;
    }>;
    usage_24h: Array<{
      provider: string;
      model: string;
      operation: string;
      calls: number;
      ok: number;
      failed: number;
      avg_latency_ms: number | null;
      last_success_at: string | null;
      last_failure_at: string | null;
      last_error: string | null;
    }>;
  };
  cron: { jobs: CronJobRow[] };
  scheduler:
    | Array<{
        job_id: string;
        dispatched: number;
        last_dispatched_at: string | null;
        http_2xx: number;
        http_non_2xx: number;
        timed_out: number;
        dispatch_errors: number;
        last_error: string | null;
      }>
    | null;
};
