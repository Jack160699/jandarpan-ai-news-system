/**
 * Phase 4 — safe translation queue recovery (dry-run default).
 * Does not execute production retries unless --execute is passed by the CLI.
 */

import {
  isNewsroomLanguage,
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import {
  isActiveReaderTarget,
  normalizeTranslateArticlePayload,
} from "@/lib/i18n/multilingual/translation-contract";
import {
  articleNeedsTranslation,
  enqueueArticleTranslation,
  getStoredTranslation,
  isCgTranslationEnabled,
} from "@/lib/i18n/multilingual/translation-queue";
import { reviveDeadJob } from "@/lib/infrastructure/jobs/queue";
import type { JobType } from "@/lib/infrastructure/jobs/types";
import { createAdminServerClient } from "@/lib/supabase";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export type TranslationRecoveryClass =
  | "eligible_retry"
  | "already_translated"
  | "duplicate_active"
  | "disabled_language"
  | "missing_article"
  | "not_published"
  | "permanent_failure"
  | "retryable_failure"
  | "manual_review";

export type TranslationCoverageReport = {
  publishedHindi: number;
  publishedEnglish: number;
  translationsRequired: number;
  translationsCompleted: number;
  translationsMissing: number;
  activePending: number;
  failedRetryable: number;
  failedPermanent: number;
  oldestPendingAt: string | null;
  coveragePct: number;
  cgEnabled: boolean;
  cgJobsExcludedFromActive: number;
};

export type TranslationRecoveryAuditEntry = {
  at: string;
  dryRun: boolean;
  jobId: string;
  articleId: string | null;
  targetLanguage: string | null;
  class: TranslationRecoveryClass;
  action: "none" | "retry" | "skip" | "quarantine_disabled";
  ok: boolean;
  detail: string;
};

export type TranslationRecoveryResult = {
  dryRun: boolean;
  examined: number;
  byClass: Record<string, number>;
  selected: number;
  actionsAttempted: number;
  actionsSucceeded: number;
  actionsFailed: number;
  audit: TranslationRecoveryAuditEntry[];
  coverage: TranslationCoverageReport;
  summary: string;
};

const RETRYABLE_ERROR_RES = [
  /^urgencyScore is not defined$/i,
  /^translation_failed$/i,
  /timeout/i,
];

const PERMANENT_ERROR_RES = [
  /^articleId_required$/i,
  /^invalid_target_language$/i,
  /^article_not_found$/i,
  /^tenant_required$/i,
];

export function classifyTranslationError(
  lastError: string | null
): "retryable" | "permanent" | "unknown" {
  const err = (lastError ?? "").trim();
  if (!err) return "unknown";
  if (PERMANENT_ERROR_RES.some((re) => re.test(err))) return "permanent";
  if (RETRYABLE_ERROR_RES.some((re) => re.test(err))) return "retryable";
  return "unknown";
}

export async function reportTranslationCoverageMetrics(options?: {
  tenantId?: string | null;
}): Promise<TranslationCoverageReport> {
  const supabase = createAdminServerClient();
  const cgEnabled = isCgTranslationEnabled();

  let articlesQuery = supabase
    .from("generated_articles")
    .select(
      "id, language, editorial_metadata, translations, published_at, editorial_status, tenant_id, headline, summary, article_body"
    )
    .not("published_at", "is", null)
    .eq("editorial_status", "approved");
  if (options?.tenantId) {
    articlesQuery = articlesQuery.eq("tenant_id", options.tenantId);
  }

  const { data: articles } = await articlesQuery;

  let publishedHindi = 0;
  let publishedEnglish = 0;
  let translationsRequired = 0;
  let translationsCompleted = 0;
  let translationsMissing = 0;

  for (const row of articles ?? []) {
    const article = row as GeneratedArticleRow;
    const source = normalizeArticleLanguage(article.language);
    if (source === "hi") publishedHindi += 1;
    if (source === "en") publishedEnglish += 1;

    const targets: NewsroomLanguage[] =
      source === "hi" ? ["en"] : source === "en" ? ["hi"] : [];
    if (cgEnabled && source === "hi") targets.push("cg");

    for (const target of targets) {
      translationsRequired += 1;
      if (getStoredTranslation(article, target)) translationsCompleted += 1;
      else if (articleNeedsTranslation(article, target)) {
        translationsMissing += 1;
      }
    }
  }

  let pendingQuery = supabase
    .from("worker_jobs")
    .select("id, payload, status, last_error, created_at, scheduled_at")
    .eq("job_type", "translate_article")
    .in("status", ["pending", "claimed", "failed", "dead"])
    .order("created_at", { ascending: true })
    .limit(500);
  if (options?.tenantId) {
    pendingQuery = pendingQuery.eq("tenant_id", options.tenantId);
  }

  const { data: jobs } = await pendingQuery;

  let activePending = 0;
  let failedRetryable = 0;
  let failedPermanent = 0;
  let cgJobsExcludedFromActive = 0;
  let oldestPendingAt: string | null = null;

  for (const job of jobs ?? []) {
    const normalized = normalizeTranslateArticlePayload(
      (job.payload as Record<string, unknown>) ?? {},
      { status: job.status as "pending" }
    );
    const target = normalized?.targetLanguage ?? null;

    if (target === "cg" && !cgEnabled) {
      cgJobsExcludedFromActive += 1;
      continue;
    }

    if (job.status === "pending" || job.status === "claimed") {
      activePending += 1;
      const ts = job.scheduled_at ?? job.created_at;
      if (!oldestPendingAt || ts < oldestPendingAt) oldestPendingAt = ts;
    }

    if (job.status === "failed" || job.status === "dead") {
      const kind = classifyTranslationError(job.last_error);
      if (kind === "permanent") failedPermanent += 1;
      else failedRetryable += 1;
    }
  }

  const coveragePct =
    translationsRequired > 0
      ? Math.round((translationsCompleted / translationsRequired) * 1000) / 10
      : 100;

  return {
    publishedHindi,
    publishedEnglish,
    translationsRequired,
    translationsCompleted,
    translationsMissing,
    activePending,
    failedRetryable,
    failedPermanent,
    oldestPendingAt,
    coveragePct,
    cgEnabled,
    cgJobsExcludedFromActive,
  };
}

export type TranslationRecoveryOptions = {
  dryRun?: boolean;
  batchSize?: number;
  tenantId?: string | null;
  languagePairs?: Array<{ source?: NewsroomLanguage; target: NewsroomLanguage }>;
  retryableErrorFilter?: string;
  includeDead?: boolean;
};

async function hasActiveDuplicate(
  dedupeKey: string,
  excludeId: string
): Promise<boolean> {
  const supabase = createAdminServerClient();
  const { count } = await supabase
    .from("worker_jobs")
    .select("id", { count: "exact", head: true })
    .eq("job_type", "translate_article")
    .eq("dedupe_key", dedupeKey)
    .in("status", ["pending", "claimed"])
    .neq("id", excludeId);
  return (count ?? 0) > 0;
}

export async function runTranslationRecovery(
  options: TranslationRecoveryOptions = {}
): Promise<TranslationRecoveryResult> {
  const dryRun = options.dryRun ?? true;
  const batchSize = Math.min(Math.max(options.batchSize ?? 10, 1), 40);
  const supabase = createAdminServerClient();
  const coverage = await reportTranslationCoverageMetrics({
    tenantId: options.tenantId,
  });

  const statuses = options.includeDead
    ? ["pending", "failed", "dead"]
    : ["pending", "failed"];

  let query = supabase
    .from("worker_jobs")
    .select(
      "id, tenant_id, dedupe_key, payload, status, attempts, priority, last_error, created_at"
    )
    .eq("job_type", "translate_article")
    .in("status", statuses)
    .order("created_at", { ascending: true })
    .limit(200);

  if (options.tenantId) query = query.eq("tenant_id", options.tenantId);

  const { data: rows, error } = await query;
  if (error) throw new Error(`translation_recovery_load_failed:${error.message}`);

  const byClass: Record<string, number> = {};
  const audit: TranslationRecoveryAuditEntry[] = [];
  const eligible: Array<{
    jobId: string;
    dedupeKey: string;
    articleId: string;
    target: NewsroomLanguage;
    tenantId: string | null;
  }> = [];

  const pairFilter = options.languagePairs?.map((p) => p.target) ?? null;
  const errorNeedle = options.retryableErrorFilter?.toLowerCase() ?? null;

  for (const row of rows ?? []) {
    const normalized = normalizeTranslateArticlePayload(
      (row.payload as Record<string, unknown>) ?? {},
      {
        tenantId: row.tenant_id,
        attempts: row.attempts,
        priority: row.priority,
        status: row.status as "pending",
        lastError: row.last_error,
        dedupeKey: row.dedupe_key,
      }
    );

    let cls: TranslationRecoveryClass = "manual_review";
    let detail = "";
    let action: TranslationRecoveryAuditEntry["action"] = "none";

    if (!normalized) {
      cls = "permanent_failure";
      detail = "malformed_payload";
      action = "skip";
    } else if (!isActiveReaderTarget(normalized.targetLanguage)) {
      cls = "disabled_language";
      detail = `target=${normalized.targetLanguage} cgEnabled=${isCgTranslationEnabled()}`;
      action = "quarantine_disabled";
    } else if (pairFilter && !pairFilter.includes(normalized.targetLanguage)) {
      cls = "manual_review";
      detail = "filtered_out_by_language_pair";
      action = "skip";
    } else if (
      errorNeedle &&
      !(row.last_error ?? "").toLowerCase().includes(errorNeedle)
    ) {
      cls = "manual_review";
      detail = "filtered_out_by_error";
      action = "skip";
    } else {
      const { data: article } = await supabase
        .from("generated_articles")
        .select(
          "id, tenant_id, language, headline, summary, article_body, editorial_metadata, translations, published_at, editorial_status"
        )
        .eq("id", normalized.articleId)
        .maybeSingle();

      if (!article) {
        cls = "missing_article";
        detail = "article_not_found";
        action = "skip";
      } else if (!article.published_at || article.editorial_status !== "approved") {
        cls = "not_published";
        detail = "not_publishable";
        action = "skip";
      } else if (
        getStoredTranslation(article as GeneratedArticleRow, normalized.targetLanguage)
      ) {
        cls = "already_translated";
        detail = "completed_translation_exists";
        action = "skip";
      } else if (await hasActiveDuplicate(row.dedupe_key, row.id)) {
        cls = "duplicate_active";
        detail = "active_sibling";
        action = "skip";
      } else {
        const errKind = classifyTranslationError(row.last_error);
        if (errKind === "permanent") {
          cls = "permanent_failure";
          detail = row.last_error ?? "permanent";
          action = "skip";
        } else if (
          row.status === "pending" ||
          errKind === "retryable" ||
          errKind === "unknown"
        ) {
          cls = row.status === "pending" ? "eligible_retry" : "retryable_failure";
          detail = row.last_error ?? "pending";
          action = "retry";
          eligible.push({
            jobId: row.id,
            dedupeKey: row.dedupe_key,
            articleId: normalized.articleId,
            target: normalized.targetLanguage,
            tenantId: row.tenant_id,
          });
        }
      }
    }

    byClass[cls] = (byClass[cls] ?? 0) + 1;
    audit.push({
      at: new Date().toISOString(),
      dryRun,
      jobId: row.id,
      articleId: normalized?.articleId ?? null,
      targetLanguage: normalized?.targetLanguage ?? null,
      class: cls,
      action,
      ok: true,
      detail,
    });
  }

  const selected = eligible.slice(0, batchSize);
  let actionsAttempted = 0;
  let actionsSucceeded = 0;
  let actionsFailed = 0;

  for (const item of selected) {
    actionsAttempted += 1;
    let ok = true;
    let detail = "dry_run_retry";

    if (!dryRun) {
      try {
        const revived = await reviveDeadJob(
          "translate_article" as JobType,
          item.dedupeKey
        );
        const enqueued =
          revived ??
          (await enqueueArticleTranslation(
            { id: item.articleId, tenant_id: item.tenantId },
            item.target,
            { priority: 7, reason: "phase4_recovery" }
          ));

        // Reset failed pending row to pending if still failed
        if (!revived) {
          await supabase
            .from("worker_jobs")
            .update({
              status: "pending",
              claimed_at: null,
              last_error: null,
              scheduled_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              result: {
                phase: "phase4_translation_recovery",
                retriedAt: new Date().toISOString(),
              },
            })
            .eq("id", item.jobId)
            .in("status", ["pending", "failed"]);
        }

        ok = Boolean(enqueued || revived);
        detail = revived
          ? `revived:${revived}`
          : enqueued
            ? `requeued:${enqueued}`
            : "retry_noop";
      } catch (err) {
        ok = false;
        detail = err instanceof Error ? err.message : "retry_failed";
      }
    }

    if (ok) actionsSucceeded += 1;
    else actionsFailed += 1;

    audit.push({
      at: new Date().toISOString(),
      dryRun,
      jobId: item.jobId,
      articleId: item.articleId,
      targetLanguage: item.target,
      class: "eligible_retry",
      action: "retry",
      ok,
      detail,
    });
  }

  // Quarantine disabled-language jobs in execute mode (annotate, no delete)
  if (!dryRun) {
    for (const entry of audit) {
      if (entry.action !== "quarantine_disabled") continue;
      actionsAttempted += 1;
      const { error: qErr } = await supabase
        .from("worker_jobs")
        .update({
          status: "failed",
          last_error: "[quarantined] disabled_language:cg",
          result: {
            quarantined: true,
            phase: "phase4_translation_recovery",
            reason: "disabled_language",
          },
          scheduled_at: new Date(Date.now() + 365 * 24 * 3_600_000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", entry.jobId)
        .in("status", ["pending", "failed", "dead"]);
      if (qErr) actionsFailed += 1;
      else actionsSucceeded += 1;
    }
  }

  return {
    dryRun,
    examined: rows?.length ?? 0,
    byClass,
    selected: selected.length,
    actionsAttempted,
    actionsSucceeded,
    actionsFailed,
    audit,
    coverage,
    summary: [
      `dryRun=${dryRun}`,
      `examined=${rows?.length ?? 0}`,
      `selected=${selected.length}`,
      `coverage=${coverage.coveragePct}%`,
      `activePending=${coverage.activePending}`,
      `cgExcluded=${coverage.cgJobsExcludedFromActive}`,
    ].join(" "),
  };
}

export function parseLanguagePairArg(raw: string): {
  source?: NewsroomLanguage;
  target: NewsroomLanguage;
} | null {
  const parts = raw.toLowerCase().split(/[:->/]/).filter(Boolean);
  if (parts.length === 1 && isNewsroomLanguage(parts[0]!)) {
    return { target: normalizeArticleLanguage(parts[0]!) };
  }
  if (
    parts.length >= 2 &&
    isNewsroomLanguage(parts[0]!) &&
    isNewsroomLanguage(parts[1]!)
  ) {
    return {
      source: normalizeArticleLanguage(parts[0]!),
      target: normalizeArticleLanguage(parts[1]!),
    };
  }
  return null;
}
