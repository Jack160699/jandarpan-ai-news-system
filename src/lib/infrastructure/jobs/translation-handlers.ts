/**
 * Translation job handlers (translation_batch, translate_article).
 *
 * Extracted verbatim from handlers.ts so the Supabase Edge translation worker can run them without importing the rest
 * of the job handlers (image analysis, GSC, analytics), which are not Edge-compatible. handlers.ts re-registers the same
 * functions, so Vercel behaviour is unchanged.
 */

import type { JobHandler, JobType } from "@/lib/infrastructure/jobs/types";
import { createAdminServerClient } from "@/lib/supabase";
import { normalizeArticleLanguage } from "@/lib/i18n/languages";
import {
  auditTranslationCoverage,
  enqueueMissingTranslationJobs,
  getStoredTranslation,
  isTranslatableArticle,
  scheduleTranslationBatchJob,
} from "@/lib/i18n/multilingual/translation-queue";
import { translateGeneratedArticle } from "@/lib/i18n/multilingual/translate";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import { asJson } from "@/types/json";

export const translationBatch: JobHandler = async (job) => {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { ok: true, result: { skipped: true, reason: "no_openai" } };
  }

  const limit = Number(job.payload.limit ?? process.env.TRANSLATION_ENQUEUE_BATCH ?? 40);
  const before = await auditTranslationCoverage();
  const { enqueued, scanned } = await enqueueMissingTranslationJobs({ limit });

  const after = await auditTranslationCoverage();
  const remaining = after.hiMissingEn + after.enMissingHi;

  if (remaining > 0 && enqueued === 0 && scanned > 0) {
    await scheduleTranslationBatchJob(job.tenant_id);
  } else if (remaining > enqueued) {
    await scheduleTranslationBatchJob(job.tenant_id);
  }

  return {
    ok: true,
    result: {
      enqueued,
      scanned,
      before,
      after,
      remaining,
    },
  };
};

export const translateArticle: JobHandler = async (job) => {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return { ok: true, result: { skipped: true, reason: "no_openai" } };
  }

  const {
    computeSourceContentVersion,
    isActiveReaderTarget,
    isArticleEligibleForAutoTranslation,
    normalizeTranslateArticlePayload,
    resolveTranslationUrgencyScore,
    bundleMatchesSourceVersion,
  } = await import("@/lib/i18n/multilingual/translation-contract");

  const normalized = normalizeTranslateArticlePayload(job.payload, {
    tenantId: job.tenant_id,
    priority: job.priority,
    attempts: job.attempts,
    status: job.status,
    lastError: job.last_error,
    dedupeKey: job.dedupe_key,
  });

  if (!normalized) {
    const articleId = String(job.payload.articleId ?? "").trim();
    if (!articleId) {
      return { ok: false, error: "articleId_required", retryable: false };
    }
    return { ok: false, error: "invalid_target_language", retryable: false };
  }

  const { articleId, targetLanguage } = normalized;

  if (!isActiveReaderTarget(targetLanguage)) {
    return {
      ok: true,
      result: { skipped: true, reason: "language_disabled", targetLanguage },
    };
  }

  const supabase = createAdminServerClient();

  const { data: row, error } = await supabase
    .from("generated_articles")
    .select(
      "id, slug, headline, summary, article_body, seo_title, seo_description, reading_time, language, tags, editorial_metadata, translations, tenant_id, published_at, editorial_status, workflow_status, event_id"
    )
    .eq("id", articleId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "article_not_found", retryable: false };
  }

  const eligibility = isArticleEligibleForAutoTranslation(row);
  if (!eligibility.eligible) {
    // Permanent skip — do not burn retries on rejected/quarantined content.
    return {
      ok: true,
      result: {
        skipped: true,
        reason: eligibility.reason,
      },
    };
  }

  const article = row as unknown as GeneratedArticleRow;

  if (!isTranslatableArticle(article)) {
    return {
      ok: true,
      result: { skipped: true, reason: "not_translatable" },
    };
  }

  const source = normalizeArticleLanguage(article.language);
  const sourceContentVersion = computeSourceContentVersion(article);

  if (source === targetLanguage) {
    return { ok: true, result: { skipped: true, reason: "same_language" } };
  }

  const existing = getStoredTranslation(article, targetLanguage);
  if (existing && bundleMatchesSourceVersion(existing, sourceContentVersion)) {
    return { ok: true, result: { skipped: true, reason: "already_translated" } };
  }

  let eventUrgency: number | null = null;
  if (article.event_id) {
    const { data: eventRow } = await supabase
      .from("news_events")
      .select("urgency_score")
      .eq("id", article.event_id)
      .maybeSingle();
    if (eventRow && typeof eventRow.urgency_score === "number") {
      eventUrgency = eventRow.urgency_score;
    }
  }

  const urgencyScore = resolveTranslationUrgencyScore({
    payloadUrgency: normalized.urgencyScore,
    eventUrgency,
    editorialMetadata: article.editorial_metadata,
  });

  const started = Date.now();
  const results = await translateGeneratedArticle(article, [targetLanguage], {
    urgencyScore,
    sourceContentVersion,
  });
  const result = results.find((r) => r.language === targetLanguage);

  if (!result?.ok) {
    return {
      ok: false,
      error: result?.error ?? "translation_failed",
      retryable: true,
    };
  }

  return {
    ok: true,
    result: {
      articleId,
      slug: article.slug,
      targetLanguage,
      sourceLanguage: source,
      sourceContentVersion,
      urgencyScore,
      durationMs: Date.now() - started,
    },
  };
};

export const TRANSLATION_HANDLERS = new Map<JobType, JobHandler>([
  ["translation_batch", translationBatch],
  ["translate_article", translateArticle],
]);
