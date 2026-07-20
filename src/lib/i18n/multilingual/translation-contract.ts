/**
 * Phase 4 — translate_article job contract + urgency / content-version helpers.
 *
 * Urgency is NOT required on the job payload historically. Intended source is
 * `news_events.urgency_score` (same contract as editorial generation). Fallback
 * `50` matches classifyEditorialTier / image-context defaults — not a silent zero.
 */

import { createHash } from "node:crypto";
import {
  isNewsroomLanguage,
  normalizeArticleLanguage,
  type NewsroomLanguage,
} from "@/lib/i18n/languages";
import type { ArticleLocaleBundle } from "@/lib/i18n/multilingual/types";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";
import { asJsonObject, type JsonObject } from "@/types/json";

export const TRANSLATION_URGENCY_DEFAULT = 50;

export function isCgTranslationEnabled(): boolean {
  return process.env.NEWSROOM_CG_TRANSLATION === "true";
}

export type TranslateArticleJobPayload = {
  articleId: string;
  tenantId: string | null;
  sourceLanguage: NewsroomLanguage;
  targetLanguage: NewsroomLanguage;
  reason: string;
  priority: number;
  createdAt: string;
  attempts: number;
  /** Stable idempotency key (mirrors worker_jobs.dedupe_key) */
  idempotencyKey: string;
  status: "pending" | "claimed" | "completed" | "failed" | "dead";
  lastError: string | null;
  sourceContentVersion: string;
  /** Optional cache of urgency; authoritative source remains the event row */
  urgencyScore?: number;
};

export type LegacyTranslatePayload = {
  articleId?: unknown;
  targetLanguage?: unknown;
  target?: unknown;
  language?: unknown;
  tenantId?: unknown;
  tenant_id?: unknown;
  sourceLanguage?: unknown;
  source_language?: unknown;
  reason?: unknown;
  priority?: unknown;
  createdAt?: unknown;
  created_at?: unknown;
  attempts?: unknown;
  sourceContentVersion?: unknown;
  source_content_version?: unknown;
  contentVersion?: unknown;
  urgencyScore?: unknown;
  urgency_score?: unknown;
};

function coerceFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * Resolve urgency for translation body tiering.
 * Order: explicit payload → event.urgency_score → editorial_metadata → default 50.
 */
export function resolveTranslationUrgencyScore(input: {
  payloadUrgency?: unknown;
  eventUrgency?: unknown;
  editorialMetadata?: unknown;
}): number {
  const fromPayload = coerceFiniteNumber(input.payloadUrgency);
  if (fromPayload != null) return fromPayload;

  const fromEvent = coerceFiniteNumber(input.eventUrgency);
  if (fromEvent != null) return fromEvent;

  const meta = input.editorialMetadata;
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const record = meta as Record<string, unknown>;
    const fromMeta = coerceFiniteNumber(
      record.urgency_score ?? record.urgencyScore
    );
    if (fromMeta != null) return fromMeta;
  }

  return TRANSLATION_URGENCY_DEFAULT;
}

export function computeSourceContentVersion(
  article: Pick<
    GeneratedArticleRow,
    "headline" | "summary" | "article_body"
  >
): string {
  const hash = createHash("sha256");
  hash.update(String(article.headline ?? ""));
  hash.update("\0");
  hash.update(String(article.summary ?? ""));
  hash.update("\0");
  hash.update(String(article.article_body ?? ""));
  return hash.digest("hex").slice(0, 16);
}

export function buildTranslationDedupeKey(
  articleId: string,
  target: NewsroomLanguage,
  sourceContentVersion?: string
): string {
  // Active uniqueness stays article+target so legacy pending jobs collapse.
  // Version is enforced at execute/skip time, not in the unique key.
  void sourceContentVersion;
  return `translate:${articleId}:${target}`;
}

export function isActiveReaderTarget(target: NewsroomLanguage): boolean {
  if (target === "cg") return isCgTranslationEnabled();
  return target === "hi" || target === "en";
}

/**
 * Articles eligible for automatic HI↔EN translation.
 * Includes scheduled/pending quality drafts approaching publication — not only
 * live published+approved rows — so generation yield recovery stories can be
 * translated before edition-publish sets published_at.
 */
export function isArticleEligibleForAutoTranslation(row: {
  published_at?: string | null;
  editorial_status?: string | null;
  workflow_status?: string | null;
}): { eligible: boolean; reason: string } {
  const status = String(row.editorial_status ?? "")
    .trim()
    .toLowerCase();
  const workflow = String(row.workflow_status ?? "")
    .trim()
    .toLowerCase();

  if (
    status === "rejected" ||
    status === "quarantined" ||
    status === "killed" ||
    workflow === "rejected" ||
    workflow === "quarantined"
  ) {
    return { eligible: false, reason: "rejected_or_quarantined" };
  }

  if (row.published_at && (status === "approved" || status === "published")) {
    return { eligible: true, reason: "published_approved" };
  }

  if (
    workflow === "scheduled" ||
    workflow === "ready" ||
    workflow === "ready_for_publish" ||
    workflow === "in_review" ||
    workflow === "approved"
  ) {
    return { eligible: true, reason: "workflow_approaching_publish" };
  }

  if (status === "pending" || status === "approved" || status === "draft") {
    return { eligible: true, reason: "editorial_pending_or_approved" };
  }

  return { eligible: false, reason: "not_ready_for_translation" };
}

/** Default queue priority — above intelligence_snapshot (5–8) starvation band. */
export const TRANSLATION_JOB_PRIORITY_DEFAULT = 9;


export function normalizeTranslateArticlePayload(
  raw: LegacyTranslatePayload | Record<string, unknown> | null | undefined,
  context?: {
    tenantId?: string | null;
    sourceLanguage?: NewsroomLanguage | null;
    sourceContentVersion?: string | null;
    priority?: number;
    attempts?: number;
    status?: TranslateArticleJobPayload["status"];
    lastError?: string | null;
    dedupeKey?: string | null;
  }
): TranslateArticleJobPayload | null {
  const payload = (raw ?? {}) as LegacyTranslatePayload;
  const articleId = String(payload.articleId ?? "").trim();
  if (!articleId) return null;

  const targetRaw = String(
    payload.targetLanguage ?? payload.target ?? payload.language ?? ""
  ).trim();
  if (!targetRaw) return null;
  const targetLanguage = normalizeArticleLanguage(targetRaw);
  // Reject unknown tokens that normalizeArticleLanguage would otherwise default to hi.
  const targetNormalizedToken = targetRaw.toLowerCase().replace(/_/g, "-");
  const targetLooksValid =
    isNewsroomLanguage(targetNormalizedToken) ||
    /^(en|english|en-)|^(hi|hindi|hi-|hin$)|^(cg|chhattisgarhi|hi-cg|hne|chg)/.test(
      targetNormalizedToken
    ) ||
    /^(mr|marathi|bn|bengali|bangla|ta|tamil|ur|urdu)/.test(
      targetNormalizedToken
    );
  if (!targetLooksValid) return null;

  const sourceRaw = String(
    payload.sourceLanguage ?? payload.source_language ?? context?.sourceLanguage ?? ""
  ).trim();
  const sourceLanguage = sourceRaw
    ? normalizeArticleLanguage(sourceRaw)
    : context?.sourceLanguage ?? "hi";

  if (sourceLanguage === targetLanguage) return null;

  const tenantId =
    (typeof payload.tenantId === "string" && payload.tenantId.trim()
      ? payload.tenantId.trim()
      : null) ??
    (typeof payload.tenant_id === "string" && payload.tenant_id.trim()
      ? payload.tenant_id.trim()
      : null) ??
    context?.tenantId ??
    null;

  const version = String(
    payload.sourceContentVersion ??
      payload.source_content_version ??
      payload.contentVersion ??
      context?.sourceContentVersion ??
      "legacy"
  ).trim() || "legacy";

  const urgency =
    coerceFiniteNumber(payload.urgencyScore) ??
    coerceFiniteNumber(payload.urgency_score) ??
    undefined;

  const priority =
    coerceFiniteNumber(payload.priority) ??
    context?.priority ??
    TRANSLATION_JOB_PRIORITY_DEFAULT;
  const attempts =
    coerceFiniteNumber(payload.attempts) ?? context?.attempts ?? 0;
  const createdAt = String(
    payload.createdAt ?? payload.created_at ?? new Date().toISOString()
  );
  const reason = String(payload.reason ?? "translate_article").trim() || "translate_article";
  const idempotencyKey =
    context?.dedupeKey?.trim() ||
    buildTranslationDedupeKey(articleId, targetLanguage, version);

  return {
    articleId,
    tenantId,
    sourceLanguage,
    targetLanguage,
    reason,
    priority,
    createdAt,
    attempts,
    idempotencyKey,
    status: context?.status ?? "pending",
    lastError: context?.lastError ?? null,
    sourceContentVersion: version,
    ...(urgency != null ? { urgencyScore: urgency } : {}),
  };
}

export function buildTranslateArticlePayload(input: {
  articleId: string;
  tenantId?: string | null;
  sourceLanguage: NewsroomLanguage;
  targetLanguage: NewsroomLanguage;
  sourceContentVersion: string;
  reason?: string;
  priority?: number;
  urgencyScore?: number | null;
}): JsonObject {
  const urgency =
    input.urgencyScore == null
      ? undefined
      : coerceFiniteNumber(input.urgencyScore) ?? undefined;

  return asJsonObject({
    articleId: input.articleId,
    tenantId: input.tenantId ?? null,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    reason: input.reason ?? "publish_or_backfill",
    priority: input.priority ?? 6,
    createdAt: new Date().toISOString(),
    attempts: 0,
    idempotencyKey: buildTranslationDedupeKey(
      input.articleId,
      input.targetLanguage,
      input.sourceContentVersion
    ),
    status: "pending",
    lastError: null,
    sourceContentVersion: input.sourceContentVersion,
    ...(urgency != null ? { urgencyScore: urgency } : {}),
  });
}

export function bundleMatchesSourceVersion(
  bundle: ArticleLocaleBundle | null | undefined,
  sourceContentVersion: string
): boolean {
  if (!bundle) return false;
  const stored = (bundle as ArticleLocaleBundle & {
    source_content_version?: string;
  }).source_content_version;
  // Legacy completed bundles (no version field) satisfy the current request
  // only when we are also treating the job as legacy. Once enqueue stamps a
  // real hash, a content edit produces a new version and must re-translate.
  if (!stored) {
    return true;
  }
  if (stored === "legacy") {
    return true;
  }
  return stored === sourceContentVersion;
}

export function withSourceContentVersion(
  bundle: ArticleLocaleBundle,
  sourceContentVersion: string
): ArticleLocaleBundle & { source_content_version: string } {
  return {
    ...bundle,
    source_content_version: sourceContentVersion,
  };
}
