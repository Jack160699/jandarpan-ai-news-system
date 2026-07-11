/**
 * Dead-letter queue triage — classify failures, requeue safe jobs, purge the rest.
 */

import {
  articleNeedsTranslation,
  enqueueArticleTranslation,
  getStoredTranslation,
  scheduleTranslationBatchJob,
} from "@/lib/i18n/multilingual/translation-queue";
import type { NewsroomLanguage } from "@/lib/i18n/languages";
import { isNewsroomLanguage } from "@/lib/i18n/languages";
import { reviveDeadJob, purgeDeadLetterRows } from "@/lib/infrastructure/jobs/queue";
import type { JobType } from "@/lib/infrastructure/jobs/types";
import { createAdminServerClient } from "@/lib/supabase";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export type DeadLetterRow = {
  id: string;
  job_id: string | null;
  job_type: string;
  dedupe_key: string;
  payload: Record<string, unknown>;
  tenant_id: string | null;
  last_error: string | null;
  failed_at: string;
};

export type DeadLetterAction =
  | "requeue"
  | "discard"
  | "skip_active";

export type DeadLetterDisposition = {
  id: string;
  jobType: string;
  lastError: string | null;
  action: DeadLetterAction;
  reason: string;
};

const PERMANENT_ERRORS = [
  /^tenant_required$/,
  /^embed_batch_empty$/,
  /^no_handler:/,
  /^article_not_found$/,
  /^invalid_target_language$/,
  /^articleId_required$/,
  /^assetId_and_tenant_required$/,
];

const RETRYABLE_ERRORS = [
  /^urgencyScore is not defined$/,
  /^translation_failed$/,
];

export function classifyDeadLetterError(lastError: string | null): "permanent" | "retryable" | "unknown" {
  const err = (lastError ?? "").trim();
  if (!err) return "unknown";
  if (PERMANENT_ERRORS.some((re) => re.test(err))) return "permanent";
  if (RETRYABLE_ERRORS.some((re) => re.test(err))) return "retryable";
  return "unknown";
}

async function hasActiveJob(jobType: string, dedupeKey: string): Promise<boolean> {
  const supabase = createAdminServerClient();
  const { count } = await supabase
    .from("worker_jobs")
    .select("id", { count: "exact", head: true })
    .eq("job_type", jobType)
    .eq("dedupe_key", dedupeKey)
    .in("status", ["pending", "claimed"]);
  return (count ?? 0) > 0;
}

async function loadArticleForDeadLetter(
  articleId: string
): Promise<GeneratedArticleRow | null> {
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("generated_articles")
    .select(
      "id, slug, headline, summary, article_body, seo_title, seo_description, reading_time, language, tags, editorial_metadata, translations, published_at, editorial_status, tenant_id"
    )
    .eq("id", articleId)
    .maybeSingle();
  return (data as GeneratedArticleRow | null) ?? null;
}

export async function classifyDeadLetter(
  row: DeadLetterRow
): Promise<DeadLetterDisposition> {
  const errorClass = classifyDeadLetterError(row.last_error);

  if (errorClass === "permanent") {
    return {
      id: row.id,
      jobType: row.job_type,
      lastError: row.last_error,
      action: "discard",
      reason: "permanent_error",
    };
  }

  if (await hasActiveJob(row.job_type, row.dedupe_key)) {
    return {
      id: row.id,
      jobType: row.job_type,
      lastError: row.last_error,
      action: "skip_active",
      reason: "active_job_exists",
    };
  }

  if (row.job_type === "translate_article") {
    const articleId = String(row.payload.articleId ?? "").trim();
    const targetRaw = String(row.payload.targetLanguage ?? "").trim().toLowerCase();

    if (!articleId || !isNewsroomLanguage(targetRaw)) {
      return {
        id: row.id,
        jobType: row.job_type,
        lastError: row.last_error,
        action: "discard",
        reason: "invalid_payload",
      };
    }

    const article = await loadArticleForDeadLetter(articleId);
    if (!article?.published_at || article.editorial_status !== "approved") {
      return {
        id: row.id,
        jobType: row.job_type,
        lastError: row.last_error,
        action: "discard",
        reason: "article_not_publishable",
      };
    }

    const target = targetRaw as NewsroomLanguage;
    if (getStoredTranslation(article, target)) {
      return {
        id: row.id,
        jobType: row.job_type,
        lastError: row.last_error,
        action: "discard",
        reason: "already_translated",
      };
    }

    if (!articleNeedsTranslation(article, target)) {
      return {
        id: row.id,
        jobType: row.job_type,
        lastError: row.last_error,
        action: "discard",
        reason: "translation_not_needed",
      };
    }

    if (errorClass === "retryable" || errorClass === "unknown") {
      return {
        id: row.id,
        jobType: row.job_type,
        lastError: row.last_error,
        action: "requeue",
        reason: "safe_retry",
      };
    }
  }

  if (row.job_type === "translation_batch") {
    return {
      id: row.id,
      jobType: row.job_type,
      lastError: row.last_error,
      action: "requeue",
      reason: "batch_retry",
    };
  }

  return {
    id: row.id,
    jobType: row.job_type,
    lastError: row.last_error,
    action: "discard",
    reason: "unclassified_stale",
  };
}

export type DeadLetterRemediationResult = {
  dryRun: boolean;
  examined: number;
  requeued: number;
  discarded: number;
  skippedActive: number;
  remaining: number;
  byJobType: Record<string, { requeued: number; discarded: number; skippedActive: number }>;
  byReason: Record<string, number>;
  dispositions: DeadLetterDisposition[];
};

export type DeadWorkerJobRemediationResult = {
  examined: number;
  revived: number;
  discarded: number;
  skippedActive: number;
  dispositions: DeadLetterDisposition[];
};

/** Revive dead rows still in worker_jobs (not copied to worker_dead_letters). */
export async function reviveDeadWorkerJobs(options?: {
  dryRun?: boolean;
  limit?: number;
  jobTypes?: string[];
}): Promise<DeadWorkerJobRemediationResult> {
  const dryRun = options?.dryRun ?? true;
  const limit = options?.limit ?? 100;
  const jobTypes = options?.jobTypes ?? ["translate_article", "translation_batch"];
  const supabase = createAdminServerClient();

  let query = supabase
    .from("worker_jobs")
    .select("id, job_type, dedupe_key, payload, tenant_id, last_error, updated_at")
    .eq("status", "dead")
    .order("updated_at", { ascending: true })
    .limit(limit);

  if (jobTypes.length) {
    query = query.in("job_type", jobTypes);
  }

  const { data: rows, error } = await query;
  if (error) {
    throw new Error(`dead_worker_job_load_failed:${error.message}`);
  }

  const dispositions: DeadLetterDisposition[] = [];
  let revived = 0;
  let discarded = 0;
  let skippedActive = 0;

  for (const row of rows ?? []) {
    const disposition = await classifyDeadLetter({
      id: row.id,
      job_id: row.id,
      job_type: row.job_type,
      dedupe_key: row.dedupe_key,
      payload: (row.payload as Record<string, unknown>) ?? {},
      tenant_id: row.tenant_id,
      last_error: row.last_error,
      failed_at: row.updated_at,
    });
    dispositions.push(disposition);

    if (disposition.action === "skip_active") {
      skippedActive += 1;
      continue;
    }
    if (disposition.action === "discard") {
      discarded += 1;
      continue;
    }
    if (disposition.action === "requeue" && !dryRun) {
      const jobId = await reviveDeadJob(
        row.job_type as JobType,
        row.dedupe_key
      );
      if (jobId) revived += 1;
      else discarded += 1;
    } else if (disposition.action === "requeue") {
      revived += 1;
    }
  }

  return {
    examined: rows?.length ?? 0,
    revived,
    discarded,
    skippedActive,
    dispositions,
  };
}

/** Remove dead worker_jobs rows superseded by pending/claimed siblings (same dedupe_key). */
export async function purgeSupersededDeadJobs(options?: {
  dryRun?: boolean;
  jobTypes?: string[];
}): Promise<{ examined: number; purged: number }> {
  const dryRun = options?.dryRun ?? true;
  const jobTypes = options?.jobTypes ?? ["translate_article", "translation_batch"];
  const supabase = createAdminServerClient();

  const { data: deadRows, error } = await supabase
    .from("worker_jobs")
    .select("id, job_type, dedupe_key")
    .eq("status", "dead")
    .in("job_type", jobTypes);

  if (error) {
    throw new Error(`purge_dead_load_failed:${error.message}`);
  }

  const idsToPurge: string[] = [];

  for (const row of deadRows ?? []) {
    const { count } = await supabase
      .from("worker_jobs")
      .select("id", { count: "exact", head: true })
      .eq("job_type", row.job_type)
      .eq("dedupe_key", row.dedupe_key)
      .in("status", ["pending", "claimed"])
      .neq("id", row.id);

    if ((count ?? 0) > 0) {
      idsToPurge.push(row.id);
    }
  }

  if (!dryRun && idsToPurge.length > 0) {
    const { error: delErr } = await supabase
      .from("worker_jobs")
      .delete()
      .in("id", idsToPurge);
    if (delErr) {
      throw new Error(`purge_dead_delete_failed:${delErr.message}`);
    }
  }

  return {
    examined: deadRows?.length ?? 0,
    purged: dryRun ? idsToPurge.length : idsToPurge.length,
  };
}

export async function runDeadLetterRemediation(options?: {
  dryRun?: boolean;
  limit?: number;
  jobTypes?: string[];
}): Promise<DeadLetterRemediationResult> {
  const dryRun = options?.dryRun ?? true;
  const limit = options?.limit ?? 500;
  const supabase = createAdminServerClient();

  let query = supabase
    .from("worker_dead_letters")
    .select("id, job_id, job_type, dedupe_key, payload, tenant_id, last_error, failed_at")
    .order("failed_at", { ascending: true })
    .limit(limit);

  if (options?.jobTypes?.length) {
    query = query.in("job_type", options.jobTypes);
  }

  const { data: rows, error } = await query;

  if (error) {
    throw new Error(`dead_letter_load_failed:${error.message}`);
  }

  const deadLetters = (rows ?? []) as DeadLetterRow[];
  const dispositions: DeadLetterDisposition[] = [];
  const byJobType: DeadLetterRemediationResult["byJobType"] = {};
  const byReason: Record<string, number> = {};

  let requeued = 0;
  let discarded = 0;
  let skippedActive = 0;
  const purgeIds: string[] = [];

  for (const row of deadLetters) {
    const disposition = await classifyDeadLetter(row);
    dispositions.push(disposition);

    const bucket = byJobType[row.job_type] ?? {
      requeued: 0,
      discarded: 0,
      skippedActive: 0,
    };

    byReason[disposition.reason] = (byReason[disposition.reason] ?? 0) + 1;

    if (disposition.action === "skip_active") {
      skippedActive += 1;
      bucket.skippedActive += 1;
      purgeIds.push(row.id);
    } else if (disposition.action === "discard") {
      discarded += 1;
      bucket.discarded += 1;
      purgeIds.push(row.id);
    } else if (disposition.action === "requeue") {
      if (!dryRun) {
        let jobId: string | null = null;

        if (row.job_type === "translate_article") {
          const articleId = String(row.payload.articleId ?? "").trim();
          const target = row.payload.targetLanguage as NewsroomLanguage;
          jobId =
            (await reviveDeadJob("translate_article", row.dedupe_key)) ??
            (await enqueueArticleTranslation(
              { id: articleId, tenant_id: row.tenant_id },
              target,
              { priority: 7 }
            ));
        } else if (row.job_type === "translation_batch") {
          jobId =
            (await reviveDeadJob("translation_batch", row.dedupe_key)) ??
            (await scheduleTranslationBatchJob(row.tenant_id));
        }

        if (jobId) {
          requeued += 1;
          bucket.requeued += 1;
          purgeIds.push(row.id);
        } else {
          discarded += 1;
          bucket.discarded += 1;
          purgeIds.push(row.id);
          byReason.enqueue_failed = (byReason.enqueue_failed ?? 0) + 1;
        }
      } else {
        requeued += 1;
        bucket.requeued += 1;
      }
    }

    byJobType[row.job_type] = bucket;
  }

  if (!dryRun && purgeIds.length > 0) {
    await purgeDeadLetterRows(purgeIds);
  }

  const { count: remaining } = await supabase
    .from("worker_dead_letters")
    .select("id", { count: "exact", head: true });

  return {
    dryRun,
    examined: deadLetters.length,
    requeued,
    discarded,
    skippedActive,
    remaining: remaining ?? 0,
    byJobType,
    byReason,
    dispositions,
  };
}
