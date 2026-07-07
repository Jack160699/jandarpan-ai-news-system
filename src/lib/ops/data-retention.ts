/**
 * Automated data retention — prevents unbounded table growth before migration.
 * Safe-by-default: only deletes rows past TTL that are not referenced by live content.
 */

import { createAdminClient } from "@/lib/supabase";
import { opsLogger } from "@/lib/observability/logger";
import { runQueueCleanup } from "@/lib/ops/queue-cleanup";
import {
  RETENTION_CONFIG,
  retentionCutoffIso,
} from "@/lib/ops/retention-config";
import { recordCronRun } from "@/lib/observability/cron-monitor";

export type RetentionTableResult = {
  table: string;
  deleted: number;
  skipped?: boolean;
  reason?: string;
};

export type DataRetentionResult = {
  ok: boolean;
  dryRun: boolean;
  durationMs: number;
  tables: RetentionTableResult[];
  queueCleanup: Awaited<ReturnType<typeof runQueueCleanup>> | null;
  articlesArchived: number;
  reputationTrimmed: number;
  signalsPurged: number;
  storageOrphans: number;
  totalDeleted: number;
};

type DeleteByCreatedAtInput = {
  table: string;
  cutoffIso: string;
  batchSize: number;
  dryRun: boolean;
  extraFilter?: (qb: ReturnType<ReturnType<typeof createAdminClient>["from"]>) => typeof qb;
};

async function deleteByCreatedAt(
  input: DeleteByCreatedAtInput
): Promise<RetentionTableResult> {
  const supabase = createAdminClient();
  let query = supabase
    .from(input.table as "worker_jobs")
    .select("id")
    .lt("created_at", input.cutoffIso)
    .limit(input.batchSize);

  if (input.extraFilter) {
    query = input.extraFilter(query) as typeof query;
  }

  const { data, error } = await query;
  if (error) {
    return { table: input.table, deleted: 0, skipped: true, reason: error.message };
  }

  const ids = (data ?? []).map((r) => (r as { id: string }).id);
  if (!ids.length) {
    return { table: input.table, deleted: 0 };
  }

  if (input.dryRun) {
    return { table: input.table, deleted: ids.length };
  }

  const { error: delError } = await supabase
    .from(input.table as "worker_jobs")
    .delete()
    .in("id", ids);

  if (delError) {
    return { table: input.table, deleted: 0, skipped: true, reason: delError.message };
  }

  return { table: input.table, deleted: ids.length };
}

async function deleteQueueArchiveByArchivedAt(
  cutoffIso: string,
  batchSize: number,
  dryRun: boolean
): Promise<RetentionTableResult> {
  const supabase = createAdminClient();
  const { data, error } = await (supabase as ReturnType<typeof createAdminClient>)
    .from("queue_cleanup_archive" as "worker_jobs")
    .select("id")
    .lt("archived_at", cutoffIso)
    .limit(batchSize);

  if (error) {
    return {
      table: "queue_cleanup_archive",
      deleted: 0,
      skipped: true,
      reason: error.message,
    };
  }

  const ids = (data ?? []).map((r) => (r as { id: string }).id);
  if (!ids.length) return { table: "queue_cleanup_archive", deleted: 0 };

  if (dryRun) return { table: "queue_cleanup_archive", deleted: ids.length };

  const { error: delError } = await (supabase as ReturnType<typeof createAdminClient>)
    .from("queue_cleanup_archive" as "worker_jobs")
    .delete()
    .in("id", ids);

  if (delError) {
    return {
      table: "queue_cleanup_archive",
      deleted: 0,
      skipped: true,
      reason: delError.message,
    };
  }

  return { table: "queue_cleanup_archive", deleted: ids.length };
}

async function purgeExpiredPromptCache(
  dryRun: boolean
): Promise<RetentionTableResult> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("openai_prompt_cache")
    .select("id")
    .lt("expires_at", now)
    .limit(RETENTION_CONFIG.batchSize);

  if (error) {
    return {
      table: "openai_prompt_cache",
      deleted: 0,
      skipped: true,
      reason: error.message,
    };
  }

  const ids = (data ?? []).map((r) => r.id);
  if (!ids.length) return { table: "openai_prompt_cache", deleted: 0 };
  if (dryRun) return { table: "openai_prompt_cache", deleted: ids.length };

  const { error: delError } = await supabase
    .from("openai_prompt_cache")
    .delete()
    .in("id", ids);

  if (delError) {
    return {
      table: "openai_prompt_cache",
      deleted: 0,
      skipped: true,
      reason: delError.message,
    };
  }

  return { table: "openai_prompt_cache", deleted: ids.length };
}

async function purgeStaleNewsSignals(
  dryRun: boolean
): Promise<{ purged: number; skipped?: boolean; reason?: string }> {
  const supabase = createAdminClient();

  if (dryRun) {
    const cutoff = retentionCutoffIso(RETENTION_CONFIG.newsSignalsDays);
    const { count, error } = await supabase
      .from("news_signals")
      .select("id", { count: "exact", head: true })
      .lt("created_at", cutoff);

    if (error) return { purged: 0, skipped: true, reason: error.message };
    return { purged: Math.min(count ?? 0, RETENTION_CONFIG.batchSize) };
  }

  const { data, error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: number | null; error: { message: string } | null }>;
  }).rpc("purge_stale_news_signals", {
    retention_days: RETENTION_CONFIG.newsSignalsDays,
    batch_limit: RETENTION_CONFIG.batchSize,
  });

  if (error) {
    opsLogger.warn("purge_stale_news_signals_rpc_failed", {
      err: error.message,
    });
    return { purged: 0, skipped: true, reason: error.message };
  }

  return { purged: Number(data ?? 0) };
}

async function trimReputationHistory(
  dryRun: boolean
): Promise<{ trimmed: number; skipped?: boolean; reason?: string }> {
  if (dryRun) {
    return { trimmed: 0 };
  }

  const supabase = createAdminClient();
  const { data, error } = await (supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: number | null; error: { message: string } | null }>;
  }).rpc("trim_source_reputation_history", {
    max_entries: RETENTION_CONFIG.reputationHistoryMax,
  });

  if (error) {
    return { trimmed: 0, skipped: true, reason: error.message };
  }

  return { trimmed: Number(data ?? 0) };
}

async function archiveExpiredPublishedArticles(
  dryRun: boolean
): Promise<number> {
  const supabase = createAdminClient();
  const cutoff = retentionCutoffIso(RETENTION_CONFIG.publishedArticleArchiveDays);

  const { data, error } = await supabase
    .from("generated_articles")
    .select("id, slug")
    .eq("workflow_status", "published")
    .in("editorial_status", ["approved", "published", "live"])
    .lt("published_at", cutoff)
    .or("homepage_pin.is.null,homepage_pin.eq.false")
    .limit(RETENTION_CONFIG.batchSize);

  if (error || !data?.length) return 0;

  if (dryRun) return data.length;

  const ids = data.map((r) => r.id);
  const { error: updateError } = await supabase
    .from("generated_articles")
    .update({
      workflow_status: "archived",
    })
    .in("id", ids);

  if (updateError) {
    opsLogger.warn("archive_expired_articles_failed", { err: updateError.message });
    return 0;
  }

  opsLogger.info("archived_expired_articles", {
    count: ids.length,
    sample: data.slice(0, 3).map((r) => r.slug),
  });

  return ids.length;
}

async function auditStorageOrphans(): Promise<number> {
  const bucket =
    process.env.NEWSROOM_STORAGE_BUCKET?.trim() ||
    process.env.NEWSROOM_DAM_BUCKET?.trim() ||
    "editorial-images";

  const supabase = createAdminClient();
  const { data: listed, error } = await supabase.storage
    .from(bucket)
    .list("generated", { limit: RETENTION_CONFIG.storageAuditLimit, sortBy: { column: "created_at", order: "asc" } });

  if (error || !listed?.length) return 0;

  const { data: articles } = await supabase
    .from("generated_articles")
    .select("hero_image_url")
    .limit(2000);

  const referenced = new Set<string>();
  for (const row of articles ?? []) {
    const url = row.hero_image_url;
    if (!url) continue;
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    if (match?.[1]) referenced.add(match[1]);
  }

  const orphans = listed.filter((f) => f.name && !referenced.has(`generated/${f.name}`));
  if (orphans.length) {
    opsLogger.info("storage_orphan_audit", {
      bucket,
      orphansSample: orphans.slice(0, 5).map((o) => o.name),
      orphanCount: orphans.length,
    });
  }

  return orphans.length;
}

export async function runDataRetention(options?: {
  dryRun?: boolean;
  skipQueueCleanup?: boolean;
}): Promise<DataRetentionResult> {
  const started = Date.now();
  const dryRun = options?.dryRun === true;
  const batch = RETENTION_CONFIG.batchSize;
  const tables: RetentionTableResult[] = [];

  const tableJobs: Array<Promise<RetentionTableResult>> = [
    deleteByCreatedAt({
      table: "ingestion_logs",
      cutoffIso: retentionCutoffIso(RETENTION_CONFIG.ingestionLogsDays),
      batchSize: batch,
      dryRun,
    }),
    deleteByCreatedAt({
      table: "ingestion_failures",
      cutoffIso: retentionCutoffIso(RETENTION_CONFIG.ingestionLogsDays),
      batchSize: batch,
      dryRun,
    }),
    deleteByCreatedAt({
      table: "ops_cron_runs",
      cutoffIso: retentionCutoffIso(RETENTION_CONFIG.opsCronRunsDays),
      batchSize: batch,
      dryRun,
    }),
    deleteByCreatedAt({
      table: "worker_job_runs",
      cutoffIso: retentionCutoffIso(RETENTION_CONFIG.workerJobRunsDays),
      batchSize: batch,
      dryRun,
    }),
    deleteByCreatedAt({
      table: "openai_usage_events",
      cutoffIso: retentionCutoffIso(RETENTION_CONFIG.openaiUsageEventsDays),
      batchSize: batch,
      dryRun,
    }),
    deleteByCreatedAt({
      table: "ops_error_events",
      cutoffIso: retentionCutoffIso(RETENTION_CONFIG.opsErrorEventsDays),
      batchSize: batch,
      dryRun,
      extraFilter: (qb) => qb.eq("resolved", true),
    }),
    deleteByCreatedAt({
      table: "event_bus_messages",
      cutoffIso: retentionCutoffIso(RETENTION_CONFIG.eventBusDays),
      batchSize: batch,
      dryRun,
      extraFilter: (qb) => qb.in("status", ["delivered", "failed"]),
    }),
    deleteQueueArchiveByArchivedAt(
      retentionCutoffIso(RETENTION_CONFIG.queueCleanupArchiveDays),
      batch,
      dryRun
    ),
    purgeExpiredPromptCache(dryRun),
  ];

  const tableResults = await Promise.all(tableJobs);
  tables.push(...tableResults);

  const [signals, reputation, articlesArchived, storageOrphans, queueCleanup] =
    await Promise.all([
      purgeStaleNewsSignals(dryRun),
      trimReputationHistory(dryRun),
      archiveExpiredPublishedArticles(dryRun),
      auditStorageOrphans(),
      options?.skipQueueCleanup
        ? Promise.resolve(null)
        : runQueueCleanup({ dryRun }).catch((err) => {
            opsLogger.warn("queue_cleanup_in_retention_failed", { err });
            return null;
          }),
    ]);

  const totalDeleted =
    tables.reduce((sum, t) => sum + t.deleted, 0) +
    signals.purged +
    (queueCleanup?.removed.total ?? 0);

  const result: DataRetentionResult = {
    ok: true,
    dryRun,
    durationMs: Date.now() - started,
    tables,
    queueCleanup,
    articlesArchived,
    reputationTrimmed: reputation.trimmed,
    signalsPurged: signals.purged,
    storageOrphans,
    totalDeleted,
  };

  await recordCronRun({
    job: "data_retention",
    ok: true,
    startedAt: new Date(started).toISOString(),
    durationMs: result.durationMs,
    degraded: tables.some((t) => t.skipped),
    workers: [],
  }).catch(() => null);

  opsLogger.info("data_retention_complete", {
    dryRun,
    totalDeleted,
    articlesArchived,
    signalsPurged: signals.purged,
    durationMs: result.durationMs,
  });

  return result;
}
