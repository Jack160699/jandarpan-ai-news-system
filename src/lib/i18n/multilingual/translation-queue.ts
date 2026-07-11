/**
 * Translation backlog queue — audit, enqueue, and worker integration
 */

import {
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import { DEFAULT_TRANSLATION_TARGETS } from "@/lib/i18n/multilingual/translate";
import { enqueueJob, enqueueJobs, countPendingJobs } from "@/lib/infrastructure/jobs/queue";
import { createAdminServerClient } from "@/lib/supabase";
import type { ArticleLocaleBundle, ArticleTranslations } from "@/lib/i18n/multilingual/types";
import { getArticleTranslations } from "@/lib/i18n/resolve-article";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

export const READER_TRANSLATION_PAIRS: Array<{
  source: NewsroomLanguage;
  target: NewsroomLanguage;
}> = [
  { source: "hi", target: "en" },
  { source: "hi", target: "cg" },
  { source: "en", target: "hi" },
];

export function translationTargetsForSource(
  source: NewsroomLanguage
): NewsroomLanguage[] {
  return READER_TRANSLATION_PAIRS.filter((p) => p.source === source).map(
    (p) => p.target
  );
}

/** Reader pairs by default; full NEWSROOM_TRANSLATE_LANGS when auto-translate enabled. */
export function translationTargetsForPublishedArticle(
  source: NewsroomLanguage
): NewsroomLanguage[] {
  if (process.env.NEWSROOM_AUTO_TRANSLATE !== "true") {
    return translationTargetsForSource(source);
  }

  const raw = process.env.NEWSROOM_TRANSLATE_LANGS?.trim();
  const langs = raw
    ? raw
        .split(",")
        .map((s) => normalizeArticleLanguage(s.trim()))
        .filter((l, i, arr) => arr.indexOf(l) === i)
    : DEFAULT_TRANSLATION_TARGETS;

  return langs.filter((target) => target !== source);
}

const TRANSLATION_JOB_BATCH =
  Number(process.env.TRANSLATION_ENQUEUE_BATCH) || 40;

const REQUIRED_BUNDLE_FIELDS: Array<keyof ArticleLocaleBundle> = [
  "headline",
  "summary",
  "article_body",
  "seo_title",
  "seo_description",
];

export type TranslationCoverageAudit = {
  publishedTotal: number;
  hiSource: number;
  enSource: number;
  hiMissingEn: number;
  hiMissingCg: number;
  enMissingHi: number;
  hiEnCoveragePct: number;
  hiCgCoveragePct: number;
  enHiCoveragePct: number;
  incompleteBundles: number;
  queuePending: number;
  queueTranslatePending: number;
  queueBatchPending: number;
  queueDead: number;
  queueFailed: number;
  queueStalled: number;
  deadLetters: number;
  backlogTotal: number;
};

export type TranslationHealthStatus = "healthy" | "degraded" | "unhealthy";

export function isTranslationBundleComplete(
  bundle: Partial<ArticleLocaleBundle> | null | undefined
): boolean {
  if (!bundle?.headline?.trim() || !bundle.summary?.trim()) return false;

  for (const field of REQUIRED_BUNDLE_FIELDS) {
    const value = bundle[field];
    if (typeof value !== "string" || !value.trim()) return false;
  }

  return true;
}

export function isTranslatableArticle(
  row: Pick<GeneratedArticleRow, "headline" | "summary" | "article_body">
): boolean {
  const headline = row.headline?.trim() ?? "";
  if (!headline || /^untitled story$/i.test(headline)) return false;
  return Boolean(row.summary?.trim() || row.article_body?.trim());
}

export function hasReaderTranslation(
  row: Pick<GeneratedArticleRow, "editorial_metadata" | "translations">,
  target: NewsroomLanguage
): boolean {
  const bundle = getArticleTranslations(
    row.editorial_metadata,
    row.translations as ArticleTranslations | null
  )[target];
  return Boolean(bundle?.headline?.trim() && bundle?.summary?.trim());
}

export function getStoredTranslation(
  row: Pick<GeneratedArticleRow, "editorial_metadata" | "translations">,
  target: NewsroomLanguage
): ArticleLocaleBundle | null {
  const bundle = getArticleTranslations(
    row.editorial_metadata,
    row.translations as ArticleTranslations | null
  )[target];
  return bundle && isTranslationBundleComplete(bundle) ? bundle : null;
}

export function articleNeedsTranslation(
  row: Pick<
    GeneratedArticleRow,
    "language" | "editorial_metadata" | "translations" | "headline" | "summary" | "article_body"
  >,
  target: NewsroomLanguage
): boolean {
  const source = normalizeArticleLanguage(row.language);
  if (source === target) return false;
  if (!isTranslatableArticle(row)) return false;
  if (hasReaderTranslation(row, target) && getStoredTranslation(row, target)) {
    return false;
  }
  const bundle = getArticleTranslations(
    row.editorial_metadata,
    row.translations as ArticleTranslations | null
  )[target];
  return !hasReaderTranslation(row, target) || !isTranslationBundleComplete(bundle);
}

export async function auditTranslationCoverage(): Promise<TranslationCoverageAudit> {
  const supabase = createAdminServerClient();

  const { data: articles, error } = await supabase
    .from("generated_articles")
    .select("id, language, editorial_metadata, translations, published_at, editorial_status")
    .not("published_at", "is", null)
    .eq("editorial_status", "approved");

  if (error) {
    throw new Error(`audit_failed:${error.message}`);
  }

  let publishedTotal = 0;
  let hiSource = 0;
  let enSource = 0;
  let hiMissingEn = 0;
  let hiMissingCg = 0;
  let enMissingHi = 0;
  let hiWithEn = 0;
  let hiWithCg = 0;
  let enWithHi = 0;
  let incompleteBundles = 0;

  for (const row of articles ?? []) {
    publishedTotal += 1;
    const typed = row as Pick<
      GeneratedArticleRow,
      "language" | "editorial_metadata" | "translations"
    >;
    const source = normalizeArticleLanguage(typed.language);
    if (source === "hi") hiSource += 1;
    if (source === "en") enSource += 1;

    const translations = getArticleTranslations(
      typed.editorial_metadata,
      typed.translations as ArticleTranslations | null
    );
    const enBundle = translations.en;
    const hiBundle = translations.hi;
    const cgBundle = translations.cg;

    if (source === "hi") {
      if (hasReaderTranslation(typed, "en")) hiWithEn += 1;
      else hiMissingEn += 1;
      if (hasReaderTranslation(typed, "cg")) hiWithCg += 1;
      else hiMissingCg += 1;
    }

    if (source === "en") {
      if (hasReaderTranslation(typed, "hi")) enWithHi += 1;
      else enMissingHi += 1;
    }

    if (
      (enBundle?.headline?.trim() && !isTranslationBundleComplete(enBundle)) ||
      (hiBundle?.headline?.trim() && !isTranslationBundleComplete(hiBundle)) ||
      (cgBundle?.headline?.trim() && !isTranslationBundleComplete(cgBundle))
    ) {
      incompleteBundles += 1;
    }
  }

  const { count: queueTranslatePending } = await supabase
    .from("worker_jobs")
    .select("id", { count: "exact", head: true })
    .eq("job_type", "translate_article")
    .eq("status", "pending");

  const { count: queueBatchPending } = await supabase
    .from("worker_jobs")
    .select("id", { count: "exact", head: true })
    .eq("job_type", "translation_batch")
    .eq("status", "pending");

  const { count: queueDead } = await supabase
    .from("worker_jobs")
    .select("id", { count: "exact", head: true })
    .in("job_type", ["translate_article", "translation_batch"])
    .eq("status", "dead");

  const staleThreshold = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count: queueFailed } = await supabase
    .from("worker_jobs")
    .select("id", { count: "exact", head: true })
    .in("job_type", ["translate_article", "translation_batch"])
    .eq("status", "failed");

  const { count: queueStalled } = await supabase
    .from("worker_jobs")
    .select("id", { count: "exact", head: true })
    .in("job_type", ["translate_article", "translation_batch"])
    .eq("status", "claimed")
    .lt("claimed_at", staleThreshold);

  const { count: deadLetters } = await supabase
    .from("worker_dead_letters")
    .select("id", { count: "exact", head: true })
    .in("job_type", ["translate_article", "translation_batch"]);

  const queuePending =
    (await countPendingJobs("translate_article")) +
    (await countPendingJobs("translation_batch"));

  const backlogTotal = hiMissingEn + hiMissingCg + enMissingHi;

  return {
    publishedTotal,
    hiSource,
    enSource,
    hiMissingEn,
    hiMissingCg,
    enMissingHi,
    hiEnCoveragePct:
      hiSource > 0 ? Math.round((hiWithEn / hiSource) * 1000) / 10 : 100,
    hiCgCoveragePct:
      hiSource > 0 ? Math.round((hiWithCg / hiSource) * 1000) / 10 : 100,
    enHiCoveragePct:
      enSource > 0 ? Math.round((enWithHi / enSource) * 1000) / 10 : 100,
    incompleteBundles,
    queuePending,
    queueTranslatePending: queueTranslatePending ?? 0,
    queueBatchPending: queueBatchPending ?? 0,
    queueDead: queueDead ?? 0,
    queueFailed: queueFailed ?? 0,
    queueStalled: queueStalled ?? 0,
    deadLetters: deadLetters ?? 0,
    backlogTotal,
  };
}

export function resolveTranslationHealth(
  audit: TranslationCoverageAudit
): TranslationHealthStatus {
  if (
    audit.queueDead > 0 ||
    audit.deadLetters > 5 ||
    audit.queueStalled > 3 ||
    (audit.backlogTotal > 50 && audit.queuePending === 0)
  ) {
    return "unhealthy";
  }
  if (
    audit.backlogTotal > 0 ||
    audit.queueFailed > 0 ||
    audit.incompleteBundles > 0 ||
    audit.queuePending > 100
  ) {
    return "degraded";
  }
  return "healthy";
}

export async function enqueueTranslationsForPublishedArticle(
  articleId: string,
  tenantId?: string | null
): Promise<number> {
  const supabase = createAdminServerClient();
  const { data: row, error } = await supabase
    .from("generated_articles")
    .select(
      "id, tenant_id, language, headline, summary, article_body, editorial_metadata, translations, published_at, editorial_status"
    )
    .eq("id", articleId)
    .maybeSingle();

  if (error || !row) return 0;
  if (!row.published_at || row.editorial_status !== "approved") return 0;

  const article = row as GeneratedArticleRow;
  if (!isTranslatableArticle(article)) return 0;

  const source = normalizeArticleLanguage(article.language);
  const targets = translationTargetsForPublishedArticle(source);
  let enqueued = 0;

  for (const target of targets) {
    if (!articleNeedsTranslation(article, target)) continue;
    const id = await enqueueArticleTranslation(
      { id: article.id, tenant_id: tenantId ?? article.tenant_id },
      target,
      { priority: 8 }
    );
    if (id) enqueued += 1;
  }

  if (enqueued > 0) {
    await scheduleTranslationBatchJob(tenantId ?? article.tenant_id ?? null);
  }

  return enqueued;
}

export async function requeueDeadTranslationJobs(
  limit = 20
): Promise<number> {
  const {
    runDeadLetterRemediation,
    reviveDeadWorkerJobs,
    purgeSupersededDeadJobs,
  } = await import("@/lib/ops/dead-letter-remediation");
  const [dlq, queue, purged] = await Promise.all([
    runDeadLetterRemediation({
      dryRun: false,
      limit,
      jobTypes: ["translate_article", "translation_batch"],
    }),
    reviveDeadWorkerJobs({
      dryRun: false,
      limit,
      jobTypes: ["translate_article", "translation_batch"],
    }),
    purgeSupersededDeadJobs({
      dryRun: false,
      jobTypes: ["translate_article", "translation_batch"],
    }),
  ]);
  return dlq.requeued + queue.revived + purged.purged;
}

export async function findArticlesMissingTranslation(input: {
  source: NewsroomLanguage;
  target: NewsroomLanguage;
  limit?: number;
  afterPublishedAt?: string | null;
}): Promise<GeneratedArticleRow[]> {
  const supabase = createAdminServerClient();
  const limit = input.limit ?? TRANSLATION_JOB_BATCH;

  let query = supabase
    .from("generated_articles")
    .select(
      "id, slug, headline, summary, article_body, seo_title, seo_description, reading_time, language, tags, editorial_metadata, translations, published_at, tenant_id"
    )
    .not("published_at", "is", null)
    .eq("editorial_status", "approved")
    .eq("language", input.source)
    .order("published_at", { ascending: false })
    .limit(Math.max(limit * 3, 120));

  if (input.afterPublishedAt) {
    query = query.gt("published_at", input.afterPublishedAt);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`missing_scan_failed:${error.message}`);
  }

  return (data ?? [])
    .filter((row) => articleNeedsTranslation(row as GeneratedArticleRow, input.target))
    .slice(0, limit) as GeneratedArticleRow[];
}

export function buildTranslationDedupeKey(
  articleId: string,
  target: NewsroomLanguage
): string {
  return `translate:${articleId}:${target}`;
}

export async function enqueueArticleTranslation(
  row: Pick<GeneratedArticleRow, "id" | "tenant_id">,
  target: NewsroomLanguage,
  options?: { priority?: number }
): Promise<string | null> {
  return enqueueJob({
    jobType: "translate_article",
    dedupeKey: buildTranslationDedupeKey(row.id, target),
    tenantId: row.tenant_id ?? null,
    payload: {
      articleId: row.id,
      targetLanguage: target,
    },
    priority: options?.priority ?? 6,
    maxAttempts: 5,
    timeoutMs: 120_000,
  });
}

export async function enqueueMissingTranslationJobs(input?: {
  limit?: number;
  pairs?: Array<{ source: NewsroomLanguage; target: NewsroomLanguage }>;
  priority?: number;
}): Promise<{ enqueued: number; scanned: number }> {
  const pairs = input?.pairs ?? READER_TRANSLATION_PAIRS;
  const perPairLimit = Math.ceil((input?.limit ?? TRANSLATION_JOB_BATCH) / pairs.length);
  let enqueued = 0;
  let scanned = 0;

  const jobs = [];

  for (const pair of pairs) {
    const rows = await findArticlesMissingTranslation({
      source: pair.source,
      target: pair.target,
      limit: perPairLimit,
    });
    scanned += rows.length;

    for (const row of rows) {
      jobs.push({
        jobType: "translate_article" as const,
        dedupeKey: buildTranslationDedupeKey(row.id, pair.target),
        tenantId: row.tenant_id ?? null,
        payload: {
          articleId: row.id,
          targetLanguage: pair.target,
        },
        priority: input?.priority ?? 6,
        maxAttempts: 5,
        timeoutMs: 120_000,
      });
    }
  }

  if (jobs.length) {
    enqueued = await enqueueJobs(jobs);
  }

  return { enqueued, scanned };
}

export async function scheduleTranslationBatchJob(
  tenantId?: string | null
): Promise<string | null> {
  return enqueueJob({
    jobType: "translation_batch",
    dedupeKey: `translation_batch:${tenantId ?? "global"}`,
    tenantId: tenantId ?? null,
    payload: {
      limit: TRANSLATION_JOB_BATCH,
    },
    priority: 7,
    maxAttempts: 3,
    timeoutMs: 180_000,
  });
}

export type TranslationPerformanceEstimate = {
  avgLatencyMs: number | null;
  articlesPerHour: number | null;
  backlogRemaining: number;
  estimatedHoursRemaining: number | null;
  estimatedOpenAiCostUsd: number | null;
};

export async function estimateTranslationPerformance(
  backlogRemaining: number
): Promise<TranslationPerformanceEstimate> {
  const supabase = createAdminServerClient();
  const { data: runs } = await supabase
    .from("worker_job_runs")
    .select("duration_ms, ok")
    .eq("job_type", "translate_article")
    .eq("ok", true)
    .order("created_at", { ascending: false })
    .limit(40);

  const durations = (runs ?? [])
    .map((r) => r.duration_ms)
    .filter((ms): ms is number => typeof ms === "number" && ms > 0);

  const avgLatencyMs =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;

  const articlesPerHour =
    avgLatencyMs && avgLatencyMs > 0
      ? Math.round((3_600_000 / avgLatencyMs) * 10) / 10
      : avgLatencyMs === null
        ? 120
        : null;

  const estimatedHoursRemaining =
    articlesPerHour && articlesPerHour > 0
      ? Math.round((backlogRemaining / articlesPerHour) * 10) / 10
      : null;

  const costPerArticle = Number(process.env.TRANSLATION_COST_USD_ESTIMATE) || 0.002;
  const estimatedOpenAiCostUsd =
    backlogRemaining > 0
      ? Math.round(backlogRemaining * costPerArticle * 100) / 100
      : 0;

  return {
    avgLatencyMs,
    articlesPerHour,
    backlogRemaining,
    estimatedHoursRemaining,
    estimatedOpenAiCostUsd,
  };
}
