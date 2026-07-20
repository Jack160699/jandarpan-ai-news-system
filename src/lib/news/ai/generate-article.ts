/**
 * AI editorial generation — production-tolerant publishing from news_events
 */

import {
  buildEditorialPipelineSystemPrompt,
  getCategoryEditorialHint,
  resolveDeskTemplateFromCategory,
} from "@/lib/ai/prompts";
import { requestChatCompletion } from "@/lib/ai/providers";
import { createAdminServerClient } from "@/lib/supabase";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { runWithConcurrency } from "@/lib/infrastructure/concurrency/pool";
import { geoFromRecord, mergeGeoMetadata, tagGeoFromContent } from "@/lib/regional/geo-tagging";
import { scoreRegionalTopic } from "@/lib/regional/topic-scoring";
import {
  createEmptyLedger,
  recordClaim,
} from "@/lib/autonomous/evidence-ledger";
import {
  decideQualityGate,
  isHighRiskStory,
  scoreHumanQuality,
  PUBLISH_THRESHOLD,
} from "@/lib/autonomous/human-quality-score";
import {
  factualPenaltyForUnsupportedNumbers,
  scanUnsupportedNumbers,
} from "@/lib/autonomous/claim-number-scan";
import { updateExistingPublishedArticle } from "@/lib/news/ai/update-existing-article";
import { optimizeSeoSlug } from "@/lib/seo/slug-optimize";
import { getPipelineTenantId } from "@/lib/tenant/pipeline";
import { buildOptimizedFactPack } from "@/lib/news/ai/optimized-fact-pack";
import {
  classifyEditorialTier,
  editorialMaxTokens,
} from "@/lib/observability/openai-cost/adaptive-tokens";
import { shouldRunEditorialRepair } from "@/lib/observability/openai-cost/repair-policy";
import { logOpenAiUsage, buildUsageRecord } from "@/lib/observability/openai-cost/record";
import {
  initialHeroPlaceholder,
  queueEditorialImageForArticle,
} from "@/lib/news/ai/generate-editorial-image";
import {
  logEditorialDecision,
  runEditorialQualityChecks,
  type EditorialQualityReport,
  type SourceAttribution,
} from "@/lib/news/ai/editorial-guards";
import {
  fingerprintBody,
  shouldQuarantineGenerationFailure,
  shouldRetryGenerationFailure,
  validateGeneratedArticle,
} from "@/lib/news/ai/generated-article-validation";
import {
  createGenerationQualityMetrics,
  logGenerationQualityMetrics,
  recordValidationOutcome,
  shouldRaiseGenerationQualityIncident,
  validationPassRate,
} from "@/lib/news/ai/generation-quality-metrics";
import { buildPublicPublishPatch } from "@/lib/newsroom/publish-state";
import {
  applyEditorialEnhancements,
  buildFallbackDraftFromFactPack,
  repairBorderlineDraft,
} from "@/lib/news/ai/editorial-repair";
import {
  analyzeEditorialBody,
  assembleEditorialBody,
  type LlmEditorialSections,
} from "@/lib/news/ai/editorial-body";
import {
  buildFallbackIntelligenceV2,
  parseEditorialIntelligenceV2,
  type EditorialIntelligenceV2,
  type LlmEditorialIntelligenceFields,
} from "@/lib/news/ai/editorial-intelligence-v2";
import type {
  BatchEditorialResult,
  EditorialDraft,
  EditorialGenerationResult,
  SupportedEditorialLanguage,
} from "@/lib/news/ai/editorial-types";
import { logNewsroom } from "@/lib/newsroom/logger";
import { EDITORIAL_CAPACITY } from "@/lib/newsroom/editorial-capacity";
import { selectEditorialCandidates } from "@/lib/infrastructure/workers/editorial-priority";
import {
  AUTO_GENERATION_MAX_AGE_HOURS,
  classifyNoSignalsForEvent,
  countFoundSignalsPerEvent,
  filterEventsWithResolvableSignals,
  isWithinAutoGenerationWindow,
  uniqueSignalIds,
} from "@/lib/news/ai/event-signal-yield";
import { asJson } from "@/types/json";
import { resolveEditorialTierPlan } from "@/lib/newsroom/ai-cost-tiers";
import type {
  GeneratedArticleInsert,
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";

export type {
  BatchEditorialResult,
  EditorialDraft,
  EditorialGenerationResult,
  SupportedEditorialLanguage,
} from "@/lib/news/ai/editorial-types";

const EDITORIAL_TIMEOUT_MS = 28_000;
const BATCH_RESCUE_COUNT = 2;

type LlmEditorialResponse = LlmEditorialIntelligenceFields & {
  headline?: string;
  summary?: string;
  sections?: LlmEditorialSections;
  seo_title?: string;
  seo_description?: string;
  tags?: string[];
};

export { analyzeEditorialBody };

type PendingCandidate = {
  event: NewsEventRow;
  draft: EditorialDraft;
  quality: EditorialQualityReport;
  signals: NewsSignalRow[];
  attributions: SourceAttribution[];
  repaired: boolean;
  usedFallback: boolean;
  intelligenceV2: EditorialIntelligenceV2 | null;
  humanQualityMeta?: {
    score: number;
    decision: string;
    highRisk: boolean;
    holdReason: string | null;
    evidenceSummary: Record<string, number>;
    unsupportedNumbers: ReturnType<typeof scanUnsupportedNumbers>;
  };
};

function logEditorial(message: string, context?: Record<string, unknown>): void {
  console.log(`[generate-article] ${message}`, context ? JSON.stringify(context) : "");
  logNewsroom("generated", message, context);
}

function logArticleGenerationPhase(
  phase:
    | "article_generation_started"
    | "article_generation_completed"
    | "article_generation_failed",
  context: Record<string, unknown>
): void {
  console.log(
    JSON.stringify({
      tag: "[ai-pipeline]",
      phase,
      ts: new Date().toISOString(),
      ...context,
    })
  );
}

function qualityResultFields(quality: EditorialQualityReport) {
  return {
    confidence: quality.ai_confidence,
    readability: quality.quality_breakdown.readability,
    seoQuality: quality.quality_breakdown.seo_quality,
    localRelevance: quality.quality_breakdown.local_relevance,
    originality: quality.quality_breakdown.originality,
    publishDecision: quality.publishDecision,
    rejectionReasons: quality.rejectionReasons,
  };
}

function isEditorialEnabled(): boolean {
  return (
    process.env.NEWSROOM_GENERATE_ARTICLES === "true" &&
    Boolean(process.env.OPENAI_API_KEY?.trim())
  );
}

function resolveLanguage(
  event: NewsEventRow,
  signals: NewsSignalRow[]
): SupportedEditorialLanguage {
  const env = process.env.NEWSROOM_EDITORIAL_LANGUAGE?.trim() as
    | SupportedEditorialLanguage
    | undefined;
  if (env === "hi" || env === "en") return env;

  const langs = signals.map((s) => s.language?.toLowerCase()).filter(Boolean);
  const hiCount = langs.filter((l) => l?.startsWith("hi")).length;
  if (hiCount >= langs.length / 2) return "hi";
  if (event.region === "chhattisgarh") return "hi";
  return "en";
}

function buildFactPack(event: NewsEventRow, signals: NewsSignalRow[]): {
  factPackText: string;
  sourceTexts: string[];
  attributions: SourceAttribution[];
} {
  const optimized = buildOptimizedFactPack(event, signals);
  return {
    factPackText: optimized.factPackText,
    sourceTexts: optimized.sourceTexts,
    attributions: optimized.attributions,
  };
}

function computeReadingTime(body: string, language: SupportedEditorialLanguage): string {
  const words = body.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return language === "hi" ? `${minutes} मिनट` : `${minutes} min read`;
}

function assembleArticleBody(
  sections: NonNullable<LlmEditorialResponse["sections"]>,
  summary: string
): string {
  return assembleEditorialBody(sections, summary);
}

function parseLlmDraft(
  raw: LlmEditorialResponse,
  language: SupportedEditorialLanguage
): EditorialDraft | null {
  const sections = raw.sections ?? {};
  const headline = raw.headline?.trim();
  const summary = raw.summary?.trim();

  if (!headline || !summary) return null;

  const article_body = assembleArticleBody(sections, summary);
  if (!article_body && summary.length < 20) return null;

  const body = article_body || summary;

  const seo_title = (raw.seo_title?.trim() || headline).slice(0, 70);
  const seo_description = (raw.seo_description?.trim() || summary).slice(0, 160);
  const tags = (raw.tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);

  return {
    headline,
    summary,
    article_body: body,
    seo_title,
    seo_description,
    tags,
    reading_time: computeReadingTime(body, language),
    language,
  };
}

async function callEditorialLlm(
  factPackText: string,
  language: SupportedEditorialLanguage,
  event: NewsEventRow,
  signalCount: number
): Promise<LlmEditorialResponse | null> {
  const deskTemplate = resolveDeskTemplateFromCategory(event.category, {
    region: event.region,
    urgencyScore: event.urgency_score,
  });
  const categoryHint = getCategoryEditorialHint(event.category);

  const system = buildEditorialPipelineSystemPrompt({
    language,
    deskTemplate,
    categoryHint,
  });

  const model =
    process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    "gpt-4o-mini";

  const tier = classifyEditorialTier({
    urgencyScore: event.urgency_score,
    signalCount,
    factPackChars: factPackText.length,
    category: event.category,
  });
  const maxTokens = editorialMaxTokens(tier);

  const result = await requestChatCompletion({
    operation: "editorial_generate",
    system,
    user: factPackText,
    model,
    temperature: 0.35,
    maxTokens,
    jsonMode: true,
    timeoutMs: EDITORIAL_TIMEOUT_MS,
    context: { worker: "editorial_generate", eventId: event.id },
  });

  if (!result.ok) return null;

  try {
    return JSON.parse(result.content) as LlmEditorialResponse;
  } catch {
    return null;
  }
}

async function loadSignalsForEvent(event: NewsEventRow): Promise<NewsSignalRow[]> {
  if (!event.signal_ids?.length) return [];

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("news_signals")
    .select("*")
    .in("id", event.signal_ids);

  if (error) {
    logEditorial("load_signals_error", { message: error.message });
    return [];
  }

  return data ?? [];
}

async function loadExistingSignalIdSet(signalIds: string[]): Promise<Set<string>> {
  const existing = new Set<string>();
  if (!signalIds.length) return existing;

  const supabase = createAdminServerClient();
  const chunkSize = 100;
  for (let i = 0; i < signalIds.length; i += chunkSize) {
    const chunk = signalIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from("news_signals")
      .select("id")
      .in("id", chunk);
    if (error) {
      logEditorial("load_signal_id_set_error", { message: error.message });
      continue;
    }
    for (const row of data ?? []) {
      if (row.id) existing.add(row.id);
    }
  }
  return existing;
}

async function loadExistingStoryIndex(): Promise<{
  headlines: string[];
  bodyFingerprints: string[];
  eventIds: string[];
  /** Published event_id → article id */
  eventToArticleId: Map<string, string>;
}> {
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("generated_articles")
    .select("id, headline, article_body, event_id, workflow_status, published_at")
    .order("created_at", { ascending: false })
    .limit(200);
  const headlines: string[] = [];
  const bodyFingerprints: string[] = [];
  const eventIds: string[] = [];
  const eventToArticleId = new Map<string, string>();
  for (const row of data ?? []) {
    if (row.headline) headlines.push(row.headline);
    if (row.article_body) bodyFingerprints.push(fingerprintBody(row.article_body));
    if (row.event_id) {
      eventIds.push(row.event_id);
      const isPublished =
        row.workflow_status === "published" || Boolean(row.published_at);
      if (isPublished && row.id && !eventToArticleId.has(row.event_id)) {
        eventToArticleId.set(row.event_id, row.id as string);
      }
    }
  }
  return { headlines, bodyFingerprints, eventIds, eventToArticleId };
}

function evaluateDraft(input: {
  draft: EditorialDraft;
  event: NewsEventRow;
  signals: NewsSignalRow[];
  factPackText: string;
  sourceTexts: string[];
  existingHeadlines: string[];
  existingBodyFingerprints?: string[];
  existingEventIds?: string[];
  forcePublish?: boolean;
}): EditorialQualityReport {
  return runEditorialQualityChecks({
    headline: input.draft.headline,
    summary: input.draft.summary,
    articleBody: input.draft.article_body,
    seoTitle: input.draft.seo_title,
    seoDescription: input.draft.seo_description,
    sourceTexts: input.sourceTexts,
    factPackText: input.factPackText,
    sourceCount: input.signals.length,
    region: input.event.region,
    category: input.event.category,
    language: input.draft.language,
    existingHeadlines: input.existingHeadlines,
    existingBodyFingerprints: input.existingBodyFingerprints,
    existingEventIds: input.existingEventIds,
    forcePublish: input.forcePublish,
    event: input.event,
  });
}

/**
 * Stage-1 human quality + unsupported-number scan.
 * May force held_for_* by flipping publish_allowed.
 */
function applyHumanQualityAndEvidenceGate(input: {
  draft: EditorialDraft;
  event: NewsEventRow;
  signals: NewsSignalRow[];
  sourceTexts: string[];
  quality: EditorialQualityReport;
}): {
  quality: EditorialQualityReport;
  humanScore: ReturnType<typeof scoreHumanQuality>;
  gate: ReturnType<typeof decideQualityGate>;
  unsupportedNumbers: ReturnType<typeof scanUnsupportedNumbers>;
  evidenceSummary: {
    signal_count: number;
    source_url_count: number;
    claim_count: number;
    unsupported_number_count: number;
  };
  holdReason: string | null;
} {
  const draftText = [
    input.draft.headline,
    input.draft.summary,
    input.draft.article_body,
  ].join("\n");

  const highRisk = isHighRiskStory(draftText);

  const unsupportedNumbers = scanUnsupportedNumbers({
    draftText,
    sourceTexts: input.sourceTexts,
  });
  const penalty = factualPenaltyForUnsupportedNumbers(unsupportedNumbers.length);

  const geo = tagGeoFromContent({
    title: input.draft.headline,
    body: draftText,
    region: input.event.region,
    category: input.event.category,
  });

  const factualBase = Math.max(
    0,
    Math.min(1, input.quality.ai_confidence) - penalty
  );

  const humanScore = scoreHumanQuality({
    factualGrounding: factualBase,
    districtRelevance: geo.is_chhattisgarh
      ? geo.primary_district
        ? 0.9
        : 0.55
      : 0.25,
    readability: Math.min(1, input.quality.quality_breakdown.readability ?? 0.6),
    sourceDiversity: Math.min(1, input.signals.length / 3),
    freshness: 0.7,
    imagePresence: 0.4,
    headlineClarity: Math.min(
      1,
      input.quality.quality_breakdown.headline_quality ?? 0.6
    ),
    threshold: PUBLISH_THRESHOLD,
  });

  const gate = decideQualityGate(humanScore.score, { isHighRisk: highRisk });
  let quality = { ...input.quality };
  let holdReason: string | null = null;

  const rejectionJoined = quality.rejectionReasons.join(" ").toLowerCase();
  const mentionsContradiction = /contradict/.test(rejectionJoined);
  const mentionsDuplicate =
    /duplicate/.test(rejectionJoined) ||
    Boolean(quality.duplicate_cluster_id);

  if (unsupportedNumbers.length > 0) {
    holdReason = "held_for_evidence";
    quality = {
      ...quality,
      publish_allowed: false,
      publishDecision: "reject",
      rejectionReasons: [
        ...quality.rejectionReasons,
        `unsupported_numbers:${unsupportedNumbers.length}`,
        holdReason,
      ],
    };
  } else if (highRisk && humanScore.score < 90) {
    holdReason = "held_for_safety";
    quality = {
      ...quality,
      publish_allowed: false,
      publishDecision: gate.decision === "repair" ? "repair" : "reject",
      should_repair: gate.decision === "repair",
      borderline: gate.decision === "repair",
      rejectionReasons: [
        ...quality.rejectionReasons,
        `human_quality:${humanScore.score}`,
        "high_risk_story",
        holdReason,
      ],
    };
  } else if (mentionsContradiction && !quality.publish_allowed) {
    holdReason = "held_for_contradiction";
    quality = {
      ...quality,
      publish_allowed: false,
      rejectionReasons: [...quality.rejectionReasons, holdReason],
    };
  } else if (mentionsDuplicate && !quality.publish_allowed) {
    holdReason = "held_for_duplicate";
    quality = {
      ...quality,
      publish_allowed: false,
      rejectionReasons: [...quality.rejectionReasons, holdReason],
    };
  } else if (gate.decision === "hold") {
    holdReason = "held_for_quality";
    quality = {
      ...quality,
      publish_allowed: false,
      publishDecision: "reject",
      rejectionReasons: [
        ...quality.rejectionReasons,
        `human_quality:${humanScore.score}`,
        holdReason,
      ],
    };
  } else if (gate.decision === "repair") {
    quality = {
      ...quality,
      should_repair: true,
      borderline: true,
      publish_allowed: false,
      publishDecision: "repair",
      rejectionReasons: [
        ...quality.rejectionReasons,
        `human_quality_repair_band:${humanScore.score}`,
        "held_for_quality",
      ],
    };
    holdReason = "held_for_quality";
  }

  const sourceUrls = input.signals
    .map((s) => s.article_url)
    .filter(Boolean);

  return {
    quality,
    humanScore,
    gate,
    unsupportedNumbers,
    evidenceSummary: {
      signal_count: input.signals.length,
      source_url_count: sourceUrls.length,
      claim_count: unsupportedNumbers.length,
      unsupported_number_count: unsupportedNumbers.length,
    },
    holdReason,
  };
}

async function persistEvidenceLedgerOptional(
  articleId: string,
  signals: NewsSignalRow[],
  unsupportedNumbers: ReturnType<typeof scanUnsupportedNumbers>
): Promise<void> {
  try {
    let ledger = createEmptyLedger(articleId);
    for (const s of signals) {
      ledger = recordClaim(ledger, {
        claimId: `signal_${s.id}`,
        claimText: (s.title ?? "").slice(0, 200),
        sourceUrls: s.article_url ? [s.article_url] : [],
        supported: true,
      });
    }
    for (const u of unsupportedNumbers) {
      ledger = recordClaim(ledger, {
        claimId: u.claimId,
        claimText: u.claimText,
        sourceUrls: [],
        supported: false,
        notes: "number_not_in_sources",
      });
    }

    const supabase = createAdminServerClient();
    await supabase.from("article_evidence_ledger" as never).upsert(
      {
        article_id: articleId,
        ledger: {
          claims: ledger.claims,
          updatedAt: ledger.updatedAt,
        },
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "article_id" }
    );
  } catch {
    // optional — never fail generation on ledger write
  }
}

async function persistGeneratedArticle(input: {
  event: NewsEventRow;
  draft: EditorialDraft;
  quality: EditorialQualityReport;
  signals: NewsSignalRow[];
  attributions: SourceAttribution[];
  repaired: boolean;
  usedFallback: boolean;
  batchRescue?: boolean;
  intelligenceV2?: EditorialIntelligenceV2 | null;
  humanQualityMeta?: {
    score: number;
    decision: string;
    highRisk: boolean;
    holdReason: string | null;
    evidenceSummary: Record<string, number>;
    unsupportedNumbers: ReturnType<typeof scanUnsupportedNumbers>;
  };
}): Promise<EditorialGenerationResult> {
  const supabase = createAdminServerClient();
  const slug = optimizeSeoSlug(input.draft.headline, input.event.id);
  const category =
    input.event.category ??
    input.signals.find((s) => s.category)?.category ??
    "world";
  const hero_image_url = initialHeroPlaceholder(category, input.event.region);

  const signalGeos = input.signals.map((s) =>
    tagGeoFromContent({
      title: s.title,
      body: s.raw_content,
      region: s.region,
      category: s.category,
    })
  );
  const draftGeo = tagGeoFromContent({
    title: input.draft.headline,
    body: [input.draft.summary, input.draft.article_body].join("\n"),
    region: input.event.region,
    category,
  });
  const geo = mergeGeoMetadata(
    geoFromRecord(input.event),
    ...signalGeos,
    draftGeo
  );
  const regionalTopic = scoreRegionalTopic({
    headline: input.draft.headline,
    summary: input.draft.summary,
    articleBody: input.draft.article_body,
    region: input.event.region,
    category,
    geo,
  });

  // Auto-publish flag now means "auto-schedule for the next edition publish window".
  // Publication is performed by the edition scheduler only (not by continuous crons).
  const autoPublish = process.env.NEWSROOM_AUTO_PUBLISH === "true";

  const urgency = Number(input.event.urgency_score ?? 0);
  const aiConfidence = Number(input.quality.ai_confidence ?? 0);
  const trustedSources = Math.max(
    Number(input.event.source_count ?? 0),
    new Set(
      (input.attributions ?? [])
        .map((a) => (a.source ?? "").trim())
        .filter(Boolean)
    ).size,
    input.signals.length
  );

  const breakingOverride =
    EDITORIAL_CAPACITY.breakingUnlimited &&
    urgency >= 95 &&
    aiConfidence >= 0.9 &&
    trustedSources >= 3;

  const breakingPatch = breakingOverride ? buildPublicPublishPatch(new Date()) : null;

  const tierPlan = resolveEditorialTierPlan({
    event: input.event,
    quality: input.quality,
    attributions: input.attributions,
    signalCount: input.signals.length,
    breakingOverride,
  });

  if (tierPlan.tier === 4) {
    return {
      ok: false,
      article: null,
      draft: input.draft,
      quality: input.quality,
      skipped: false,
      reason: `tier4_reject:${tierPlan.reason}`,
    };
  }

  const persistValidation = validateGeneratedArticle({
    headline: input.draft.headline,
    summary: input.draft.summary,
    articleBody: input.draft.article_body,
    language: input.draft.language,
    category: input.event.category ?? category,
    region: input.event.region,
    sourceAttributions: input.attributions,
    sourceUrls: input.attributions.map((a) => a.article_url).filter(Boolean),
    generationMetadata: {
      event_id: input.event.id,
      generated_at: new Date().toISOString(),
      model:
        process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
        process.env.OPENAI_MODEL?.trim() ||
        "gpt-4o-mini",
    },
    eventId: input.event.id,
    stage: "persist",
  });

  if (!persistValidation.ok) {
    const codes = persistValidation.codes.join(",");
    logEditorial("persist_validation_failed", {
      eventId: input.event.id,
      codes,
      issues: persistValidation.issues,
    });
    return {
      ok: false,
      article: null,
      draft: input.draft,
      quality: input.quality,
      skipped: false,
      reason: `validation_failed:${codes}`,
    };
  }

  const row: GeneratedArticleInsert = {
    tenant_id: getPipelineTenantId(),
    event_id: input.event.id,
    slug,
    headline: input.draft.headline,
    summary: input.draft.summary,
    article_body: input.draft.article_body,
    hero_image_url,
    seo_title: input.draft.seo_title,
    seo_description: input.draft.seo_description,
    reading_time: input.draft.reading_time,
    language: input.draft.language,
    tags: input.draft.tags.length
      ? input.draft.tags
      : input.event.category
        ? [input.event.category]
        : [],
    editorial_status: breakingPatch?.editorial_status ?? "pending",
    published_at: breakingPatch?.published_at ?? null,
    workflow_status: breakingPatch?.workflow_status ?? (autoPublish ? "scheduled" : "draft"),
    reviewed_at: breakingPatch?.reviewed_at ?? null,
    geo_metadata: geo,
    editorial_metadata: {
      ai_confidence: input.quality.ai_confidence,
      source_attribution: input.attributions,
      quality_report: input.quality,
      quality_breakdown: input.quality.quality_breakdown,
      rejection_reasons: input.quality.rejectionReasons,
      repaired: input.repaired,
      used_fallback: input.usedFallback,
      batch_rescue: input.batchRescue ?? false,
      generated_at: new Date().toISOString(),
      breaking_override: breakingOverride,
      trusted_sources: trustedSources,
      cost_tier: tierPlan.tier,
      cost_plan: {
        tier: tierPlan.tier,
        reason: tierPlan.reason,
        generateImage: tierPlan.generateImage,
        generateTranslation: tierPlan.generateTranslation,
        generateEmbedding: tierPlan.generateEmbedding,
        generateShorts: tierPlan.generateShorts,
        signals: tierPlan.signals,
      },
      model:
        process.env.NEWSROOM_EDITORIAL_MODEL?.trim() ||
        process.env.OPENAI_MODEL?.trim() ||
        "gpt-4o-mini",
      event_id: input.event.id,
      source_count: input.signals.length,
      duplicate_cluster_id: input.quality.duplicate_cluster_id,
      breaking_score: input.quality.quality_breakdown.breaking_score,
      trend_score: input.quality.quality_breakdown.trend_score,
      headline_quality: input.quality.quality_breakdown.headline_quality,
      spam_score: input.quality.quality_breakdown.spam_score,
      publish_decision: input.quality.publishDecision,
      regional: geo,
      regional_topic_score: regionalTopic.score,
      structure: ["lead", "details", "context"],
      title_fingerprint: persistValidation.titleFingerprint,
      body_fingerprint: persistValidation.bodyFingerprint,
      phase5_validation: { ok: true, stage: "persist" },
      desk_template: resolveDeskTemplateFromCategory(input.event.category, {
        region: input.event.region,
        urgencyScore: input.event.urgency_score,
      }),
      ...(input.intelligenceV2
        ? { intelligence_v2: input.intelligenceV2 }
        : {}),
      ...(input.humanQualityMeta
        ? {
            human_quality_score: input.humanQualityMeta.score,
            human_quality_decision: input.humanQualityMeta.decision,
            human_quality_high_risk: input.humanQualityMeta.highRisk,
            hold_reason: input.humanQualityMeta.holdReason,
            evidence_ledger_summary: input.humanQualityMeta.evidenceSummary,
          }
        : {}),
      image: {
        status: "queued",
        hero_url: hero_image_url,
        source: "category_fallback",
      },
    },
  };

  const { data: inserted, error } = await supabase
    .from("generated_articles")
    .insert({
      ...row,
      geo_metadata: asJson(row.geo_metadata),
      editorial_metadata: asJson(row.editorial_metadata),
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        article: null,
        draft: input.draft,
        quality: input.quality,
        skipped: true,
        reason: "slug_already_exists",
      };
    }
    return {
      ok: false,
      article: null,
      draft: input.draft,
      quality: input.quality,
      skipped: false,
      reason: error.message,
    };
  }

  if (input.humanQualityMeta) {
    await persistEvidenceLedgerOptional(
      inserted.id,
      input.signals,
      input.humanQualityMeta.unsupportedNumbers
    );
  }

  logEditorialDecision({
    confidence: input.quality.ai_confidence,
    readability: input.quality.quality_breakdown.readability,
    seoQuality: input.quality.quality_breakdown.seo_quality,
    localRelevance: input.quality.quality_breakdown.local_relevance,
    originality: input.quality.quality_breakdown.originality,
    publishDecision: input.quality.publishDecision,
    accepted: true,
    rejectionReasons: input.quality.rejectionReasons,
    storyId: inserted.id,
    title: input.draft.headline,
    eventId: input.event.id,
    repaired: input.repaired,
    batchRescue: input.batchRescue,
    breakingScore: input.quality.quality_breakdown.breaking_score,
    trendScore: input.quality.quality_breakdown.trend_score,
    duplicateClusterId: input.quality.duplicate_cluster_id,
    quality_breakdown: input.quality.quality_breakdown,
  });

  if (tierPlan.generateImage) {
    await queueEditorialImageForArticle(inserted.id);
  }

  return {
    ok: true,
    article: inserted as unknown as GeneratedArticleRow,
    draft: input.draft,
    quality: input.quality,
    skipped: false,
    repaired: input.repaired,
    usedFallback: input.usedFallback,
  };
}

async function prepareCandidate(
  event: NewsEventRow,
  existingHeadlines: string[],
  storyIndex?: {
    bodyFingerprints?: string[];
    eventIds?: string[];
  }
): Promise<{
  candidate: PendingCandidate | null;
  skipped: boolean;
  reason?: string;
}> {
  const signals = await loadSignalsForEvent(event);
  if (!signals.length) {
    const classification = classifyNoSignalsForEvent({
      event,
      foundSignalCount: 0,
    });
    return {
      candidate: null,
      skipped: true,
      reason: classification.reason,
    };
  }

  const language = resolveLanguage(event, signals);
  const { factPackText, sourceTexts, attributions } = buildFactPack(
    event,
    signals
  );

  let draft: EditorialDraft | null = null;
  let usedFallback = false;
  let intelligenceV2: EditorialIntelligenceV2 | null = null;
  const generatedAt = new Date().toISOString();

  try {
    const llmRaw = await callEditorialLlm(factPackText, language, event, signals.length);
    if (llmRaw) {
      draft = parseLlmDraft(llmRaw, language);
      intelligenceV2 = parseEditorialIntelligenceV2(llmRaw, {
        tags: draft?.tags ?? (llmRaw.tags ?? []).map((t) => String(t)),
        generatedAt,
      });
    }
  } catch (err) {
    logEditorial("llm_error", {
      eventId: event.id,
      message: err instanceof Error ? err.message : "LLM failed",
    });
  }

  if (!draft) {
    draft = buildFallbackDraftFromFactPack({ event, signals, language });
    usedFallback = true;
    logEditorial("fallback_draft_used", { eventId: event.id });
  } else {
    draft = applyEditorialEnhancements(draft, event);
  }

  if (!intelligenceV2) {
    intelligenceV2 = buildFallbackIntelligenceV2({ event, signals, draft });
  }

  let repaired = false;
  let quality = evaluateDraft({
    draft,
    event,
    signals,
    factPackText,
    sourceTexts,
    existingHeadlines,
    existingBodyFingerprints: storyIndex?.bodyFingerprints,
    existingEventIds: storyIndex?.eventIds,
  });

  const repairDecision = shouldRunEditorialRepair(quality);

  if (repairDecision.shouldRepair) {
    draft = await repairBorderlineDraft({
      draft,
      event,
      factPackText,
      language,
    });
    repaired = true;
    quality = evaluateDraft({
      draft,
      event,
      signals,
      factPackText,
      sourceTexts,
      existingHeadlines,
      existingBodyFingerprints: storyIndex?.bodyFingerprints,
      existingEventIds: storyIndex?.eventIds,
    });
    logEditorial("borderline_repaired", {
      eventId: event.id,
      confidence: quality.ai_confidence,
      passed: quality.publish_allowed,
      reasons: repairDecision.reasons,
    });
  } else if (quality.should_repair && !quality.hard_reject) {
    logOpenAiUsage(
      buildUsageRecord({
        operation: "editorial_repair",
        endpoint: "chat.completions",
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        inputTokens: 0,
        outputTokens: 0,
        success: true,
        context: { worker: "editorial_generate", eventId: event.id },
        metadata: {
          repairSkipped: true,
          repairSavedUsd: 0.002,
          skippedReasons: repairDecision.reasons,
        },
      })
    );
    logEditorial("repair_skipped", {
      eventId: event.id,
      reasons: repairDecision.reasons,
    });
  }

  const hqGate = applyHumanQualityAndEvidenceGate({
    draft,
    event,
    signals,
    sourceTexts,
    quality,
  });
  quality = hqGate.quality;

  return {
    candidate: {
      event,
      draft,
      quality,
      signals,
      attributions,
      repaired,
      usedFallback,
      intelligenceV2,
      humanQualityMeta: {
        score: hqGate.humanScore.score,
        decision: hqGate.gate.decision,
        highRisk: hqGate.gate.highRisk,
        holdReason: hqGate.holdReason,
        evidenceSummary: hqGate.evidenceSummary,
        unsupportedNumbers: hqGate.unsupportedNumbers,
      },
    },
    skipped: false,
  };
}

/**
 * Dry-run editorial draft for verification — does not persist or run repair.
 */
export async function previewEditorialDraftFromEvent(
  event: NewsEventRow
): Promise<{
  draft: EditorialDraft | null;
  usedFallback: boolean;
  reason?: string;
}> {
  const signals = await loadSignalsForEvent(event);
  if (!signals.length) {
    return { draft: null, usedFallback: false, reason: "no_signals_for_event" };
  }

  const language = resolveLanguage(event, signals);
  const { factPackText } = buildFactPack(event, signals);

  let draft: EditorialDraft | null = null;
  let usedFallback = false;

  try {
    const llmRaw = await callEditorialLlm(factPackText, language, event, signals.length);
    draft = llmRaw ? parseLlmDraft(llmRaw, language) : null;
  } catch {
    draft = null;
  }

  if (!draft) {
    draft = buildFallbackDraftFromFactPack({ event, signals, language });
    usedFallback = true;
  } else {
    draft = applyEditorialEnhancements(draft, event);
  }

  return { draft, usedFallback };
}

/**
 * Generate one original editorial from a news_event + its signals.
 */
export async function generateEditorialFromEvent(
  event: NewsEventRow,
  options?: { existingHeadlines?: string[]; forcePublish?: boolean }
): Promise<EditorialGenerationResult> {
  logArticleGenerationPhase("article_generation_started", {
    eventId: event.id,
    region: event.region,
    category: event.category,
    sourceCount: event.source_count,
  });
  if (!isEditorialEnabled()) {
    return {
      ok: false,
      article: null,
      draft: null,
      quality: null,
      skipped: true,
      reason: "OPENAI_API_KEY not set",
    };
  }

  const storyIndex = await loadExistingStoryIndex();
  const existingHeadlines =
    options?.existingHeadlines ?? storyIndex.headlines;

  const prepared = await prepareCandidate(event, existingHeadlines, {
    bodyFingerprints: storyIndex.bodyFingerprints,
    eventIds: storyIndex.eventIds,
  });
  if (!prepared.candidate) {
    logArticleGenerationPhase("article_generation_failed", {
      eventId: event.id,
      reason: prepared.reason ?? "prepare_candidate_failed",
      skipped: prepared.skipped,
    });
    return {
      ok: false,
      article: null,
      draft: null,
      quality: null,
      skipped: prepared.skipped,
      reason: prepared.reason,
    };
  }

  const { candidate } = prepared;
  let quality = candidate.quality;

  if (options?.forcePublish && !quality.hard_reject) {
    quality = evaluateDraft({
      draft: candidate.draft,
      event: candidate.event,
      signals: candidate.signals,
      factPackText: buildFactPack(candidate.event, candidate.signals).factPackText,
      sourceTexts: buildFactPack(candidate.event, candidate.signals).sourceTexts,
      existingHeadlines,
      forcePublish: true,
    });
  }

  logEditorial("quality_report", {
    eventId: event.id,
    passed: quality.publish_allowed,
    confidence: quality.ai_confidence,
    overlap: quality.source_overlap_score,
    hardReject: quality.hard_reject,
    rejectionReasons: quality.rejectionReasons,
    breakdown: quality.quality_breakdown,
    minConfidence: quality.min_confidence_used,
    strictMode: quality.strict_mode,
  });

  if (!quality.publish_allowed) {
    logEditorialDecision({
      confidence: quality.ai_confidence,
      readability: quality.quality_breakdown.readability,
      seoQuality: quality.quality_breakdown.seo_quality,
      localRelevance: quality.quality_breakdown.local_relevance,
      originality: quality.quality_breakdown.originality,
      publishDecision: quality.publishDecision,
      accepted: false,
      rejectionReasons: quality.rejectionReasons,
      storyId: null,
      title: candidate.draft.headline,
      eventId: event.id,
      repaired: candidate.repaired,
      breakingScore: quality.quality_breakdown.breaking_score,
      trendScore: quality.quality_breakdown.trend_score,
      duplicateClusterId: quality.duplicate_cluster_id,
      quality_breakdown: quality.quality_breakdown,
    });

    logArticleGenerationPhase("article_generation_failed", {
      eventId: event.id,
      reason: quality.hard_reject
        ? quality.hard_reject_reasons.join(",")
        : "quality_checks_failed",
      hardReject: quality.hard_reject,
      confidence: quality.ai_confidence,
    });
    return {
      ok: false,
      article: null,
      draft: candidate.draft,
      quality,
      skipped: false,
      repaired: candidate.repaired,
      usedFallback: candidate.usedFallback,
      reason: quality.hard_reject
        ? quality.hard_reject_reasons.join(",")
        : "quality_checks_failed",
    };
  }

  const persisted = await persistGeneratedArticle({
    event: candidate.event,
    draft: candidate.draft,
    quality,
    signals: candidate.signals,
    attributions: candidate.attributions,
    repaired: candidate.repaired,
    usedFallback: candidate.usedFallback,
    intelligenceV2: candidate.intelligenceV2,
    humanQualityMeta: candidate.humanQualityMeta,
  });
  if (persisted.ok && persisted.article) {
    logArticleGenerationPhase("article_generation_completed", {
      eventId: event.id,
      articleId: persisted.article.id,
      headline: persisted.article.headline,
      confidence: quality.ai_confidence,
    });
  } else {
    logArticleGenerationPhase("article_generation_failed", {
      eventId: event.id,
      reason: persisted.reason ?? "persist_failed",
      skipped: persisted.skipped,
    });
  }
  return persisted;
}

/**
 * Batch-generate editorials; rescues top scorers if entire batch would fail.
 */
export async function generateEditorialsFromEvents(options?: {
  limit?: number;
}): Promise<BatchEditorialResult> {
  const limit = options?.limit ?? INFRA_CONFIG.editorialBatchLimit;

  if (!isEditorialEnabled()) {
    return {
      generated: 0,
      rejected: 0,
      published: 0,
      repaired: 0,
      skipped: 1,
      avgConfidence: 0,
      topStory: null,
      errors: ["OPENAI_API_KEY not set"],
      results: [],
    };
  }

  const supabase = createAdminServerClient();
  const storyIndex = await loadExistingStoryIndex();
  const existingHeadlines = [...storyIndex.headlines];
  const existingBodyFingerprints = [...storyIndex.bodyFingerprints];
  const usedEventIds = new Set(storyIndex.eventIds);
  const qualityMetrics = createGenerationQualityMetrics();
  const validationAttempts = new Map<string, number>();

  // Prefer the auto-generation freshness window so high-urgency orphans with
  // deleted signal rows cannot monopolize the candidate pool.
  const windowStart = new Date(
    Date.now() - AUTO_GENERATION_MAX_AGE_HOURS * 3_600_000
  ).toISOString();
  const fetchLimit = Math.max(limit * 40, 80);

  let { data: events, error } = await supabase
    .from("news_events")
    .select("*")
    .gte("created_at", windowStart)
    .order("urgency_score", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(fetchLimit);

  if (!error && (events?.length ?? 0) < limit * 5) {
    const expandedStart = new Date(
      Date.now() - AUTO_GENERATION_MAX_AGE_HOURS * 2 * 3_600_000
    ).toISOString();
    const expanded = await supabase
      .from("news_events")
      .select("*")
      .gte("created_at", expandedStart)
      .order("urgency_score", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(fetchLimit);
    if (!expanded.error && expanded.data?.length) {
      events = expanded.data;
      error = expanded.error;
    }
  }

  if (error || !events?.length) {
    return {
      generated: 0,
      rejected: 0,
      published: 0,
      repaired: 0,
      skipped: 1,
      avgConfidence: 0,
      topStory: null,
      errors: error ? [error.message] : [],
      results: [],
    };
  }

  const windowed = (events as NewsEventRow[]).filter(
    (e) => isWithinAutoGenerationWindow(e) && !usedEventIds.has(e.id)
  );

  // Bound update pass: already-published events that may have new signals (max 3).
  const MAX_EXISTING_UPDATES = 3;
  const updateCandidates = (events as NewsEventRow[])
    .filter(
      (e) =>
        isWithinAutoGenerationWindow(e) &&
        usedEventIds.has(e.id) &&
        storyIndex.eventToArticleId.has(e.id)
    )
    .slice(0, MAX_EXISTING_UPDATES);

  const existingSignalIds = await loadExistingSignalIdSet(
    uniqueSignalIds(windowed)
  );
  const foundByEvent = countFoundSignalsPerEvent(windowed, existingSignalIds);
  const resolvable = filterEventsWithResolvableSignals(windowed, foundByEvent);

  const filteredNoSignals = windowed.length - resolvable.length;
  if (filteredNoSignals > 0) {
    logEditorial("generation_yield_filter", {
      windowed: windowed.length,
      resolvable: resolvable.length,
      filteredNoSignals,
    });
  }

  const eligible = resolvable;
  const pending = selectEditorialCandidates(eligible, limit);
  const candidatePool = {
    windowed: windowed.length,
    resolvable: resolvable.length,
    filteredNoSignals,
    selected: pending.length,
  };

  let published = 0;
  let rejected = 0;
  let repaired = 0;
  let skipped = 0;
  let updates = 0;
  const errors: string[] = [];
  const results: BatchEditorialResult["results"] = [];
  const failedCandidates: PendingCandidate[] = [];
  const confidenceScores: number[] = [];
  let lastPublishedStory: { id: string; title: string; confidence: number } | null =
    null;

  for (const event of updateCandidates) {
    try {
      const updated = await updateExistingPublishedArticle(event.id);
      if (updated.ok && !updated.skipped) {
        updates += 1;
        results.push({
          eventId: event.id,
          ok: true,
          updated: true,
          reason: updated.reason,
        });
      } else if (!updated.ok && !updated.skipped) {
        errors.push(`${event.id}:update:${updated.reason}`);
      }
    } catch (err) {
      errors.push(
        `${event.id}:update:${err instanceof Error ? err.message : "update_failed"}`
      );
    }
  }

  const preparedList = await runWithConcurrency(
    pending,
    INFRA_CONFIG.editorialConcurrency,
    (event) =>
      prepareCandidate(
        event,
        [
          ...existingHeadlines,
          ...failedCandidates.map((c) => c.draft.headline),
        ],
        {
          bodyFingerprints: existingBodyFingerprints,
          eventIds: [...usedEventIds],
        }
      )
  );

  for (let i = 0; i < pending.length; i++) {
    const event = pending[i];
    const prepared = preparedList[i];
    logArticleGenerationPhase("article_generation_started", {
      eventId: event.id,
      region: event.region,
      category: event.category,
      sourceCount: event.source_count,
      mode: "batch",
    });

    if (!prepared.candidate) {
      logArticleGenerationPhase("article_generation_failed", {
        eventId: event.id,
        reason: prepared.reason ?? "prepare_candidate_failed",
        skipped: true,
        mode: "batch",
      });
      skipped++;
      results.push({
        eventId: event.id,
        ok: false,
        reason: prepared.reason,
      });
      continue;
    }

    const { candidate } = prepared;
    confidenceScores.push(candidate.quality.ai_confidence);

    if (candidate.repaired) repaired++;

    if (candidate.quality.publish_allowed) {
      const saved = await persistGeneratedArticle({
        event: candidate.event,
        draft: candidate.draft,
        quality: candidate.quality,
        signals: candidate.signals,
        attributions: candidate.attributions,
        repaired: candidate.repaired,
        usedFallback: candidate.usedFallback,
        intelligenceV2: candidate.intelligenceV2,
        humanQualityMeta: candidate.humanQualityMeta,
      });

      results.push({
        eventId: event.id,
        ok: saved.ok,
        published: saved.ok,
        repaired: candidate.repaired,
        reason: saved.reason,
        ...qualityResultFields(candidate.quality),
      });

      if (saved.ok && saved.article) {
        recordValidationOutcome(qualityMetrics, {
          ok: true,
          issues: [],
          codes: [],
          retryable: false,
          quarantineRecommended: false,
          titleFingerprint: "",
          bodyFingerprint: fingerprintBody(candidate.draft.article_body),
          metrics: {
            titleFailure: false,
            bodyFailure: false,
            missingSource: false,
            duplicateRejection: false,
            languageFailure: false,
          },
        });
        logArticleGenerationPhase("article_generation_completed", {
          eventId: event.id,
          articleId: saved.article.id,
          headline: saved.article.headline,
          confidence: candidate.quality.ai_confidence,
          mode: "batch",
        });
        published++;
        existingHeadlines.push(candidate.draft.headline);
        existingBodyFingerprints.push(
          fingerprintBody(candidate.draft.article_body)
        );
        usedEventIds.add(event.id);
        if (
          !lastPublishedStory ||
          candidate.quality.ai_confidence > lastPublishedStory.confidence
        ) {
          lastPublishedStory = {
            id: saved.article.id,
            title: saved.article.headline,
            confidence: candidate.quality.ai_confidence,
          };
        }
      } else if (saved.skipped) skipped++;
      else {
        logArticleGenerationPhase("article_generation_failed", {
          eventId: event.id,
          reason: saved.reason ?? "persist_failed",
          skipped: false,
          mode: "batch",
        });
        rejected++;
        if (saved.reason) errors.push(`${event.id}: ${saved.reason}`);
      }
    } else {
      // One invalid article must not stop the batch — classify + continue.
      const structural = validateGeneratedArticle({
        headline: candidate.draft.headline,
        summary: candidate.draft.summary,
        articleBody: candidate.draft.article_body,
        language: candidate.draft.language,
        category: candidate.event.category,
        region: candidate.event.region,
        eventId: candidate.event.id,
        existingHeadlines,
        existingBodyFingerprints,
        existingEventIds: [...usedEventIds],
        stage: "draft",
      });
      const attempts = (validationAttempts.get(event.id) ?? 0) + 1;
      validationAttempts.set(event.id, attempts);
      const retryable = shouldRetryGenerationFailure(structural, attempts);
      const quarantine = shouldQuarantineGenerationFailure(structural, attempts);
      recordValidationOutcome(qualityMetrics, structural, {
        retried: retryable,
        quarantined: quarantine,
        manualReview: quarantine || structural.quarantineRecommended,
      });

      let reason = candidate.quality.hard_reject
        ? candidate.quality.hard_reject_reasons.join(",")
        : "quality_checks_failed";
      if (!structural.ok) {
        reason = `validation_failed:${structural.codes.join(",")}`;
      }
      if (quarantine) {
        reason = `quarantine:${reason};manual_review_required`;
      } else if (retryable) {
        reason = `retryable:${reason}`;
      }

      logArticleGenerationPhase("article_generation_failed", {
        eventId: event.id,
        reason,
        hardReject: candidate.quality.hard_reject,
        confidence: candidate.quality.ai_confidence,
        mode: "batch",
        validationCodes: structural.codes,
        attempts,
        quarantine,
      });
      if (!quarantine) failedCandidates.push(candidate);
      rejected++;
      results.push({
        eventId: event.id,
        ok: false,
        published: false,
        repaired: candidate.repaired,
        reason,
        ...qualityResultFields(candidate.quality),
      });

      logEditorialDecision({
        ...qualityResultFields(candidate.quality),
        accepted: false,
        storyId: null,
        title: candidate.draft.headline,
        eventId: event.id,
        repaired: candidate.repaired,
        breakingScore: candidate.quality.quality_breakdown.breaking_score,
        trendScore: candidate.quality.quality_breakdown.trend_score,
        duplicateClusterId: candidate.quality.duplicate_cluster_id,
        quality_breakdown: candidate.quality.quality_breakdown,
      });
    }
  }

  if (published === 0 && failedCandidates.length > 0) {
    const rescuable = failedCandidates
      .filter((c) => !c.quality.hard_reject)
      .sort((a, b) => b.quality.ai_confidence - a.quality.ai_confidence)
      .slice(0, BATCH_RESCUE_COUNT);

    for (const candidate of rescuable) {
      const { factPackText, sourceTexts } = buildFactPack(
        candidate.event,
        candidate.signals
      );
      const quality = evaluateDraft({
        draft: candidate.draft,
        event: candidate.event,
        signals: candidate.signals,
        factPackText,
        sourceTexts,
        existingHeadlines,
        forcePublish: true,
      });

      const saved = await persistGeneratedArticle({
        event: candidate.event,
        draft: candidate.draft,
        quality,
        signals: candidate.signals,
        attributions: candidate.attributions,
        repaired: candidate.repaired,
        usedFallback: candidate.usedFallback,
        batchRescue: true,
        intelligenceV2: candidate.intelligenceV2,
        humanQualityMeta: candidate.humanQualityMeta,
      });

      if (saved.ok && saved.article) {
        logArticleGenerationPhase("article_generation_completed", {
          eventId: candidate.event.id,
          articleId: saved.article.id,
          headline: saved.article.headline,
          confidence: quality.ai_confidence,
          mode: "batch_rescue",
        });
        published++;
        rejected = Math.max(0, rejected - 1);
        const idx = results.findIndex((r) => r.eventId === candidate.event.id);
        const entry = {
          eventId: candidate.event.id,
          ok: true,
          published: true,
          repaired: candidate.repaired,
          reason: "batch_rescue_top_scorer",
          ...qualityResultFields(quality),
          rejectionReasons: [] as string[],
        };
        if (idx >= 0) results[idx] = entry;
        else results.push(entry);
        existingHeadlines.push(candidate.draft.headline);
        if (
          !lastPublishedStory ||
          quality.ai_confidence > lastPublishedStory.confidence
        ) {
          lastPublishedStory = {
            id: saved.article.id,
            title: saved.article.headline,
            confidence: quality.ai_confidence,
          };
        }
      }
      if (!saved.ok) {
        logArticleGenerationPhase("article_generation_failed", {
          eventId: candidate.event.id,
          reason: saved.reason ?? "batch_rescue_persist_failed",
          skipped: saved.skipped,
          mode: "batch_rescue",
        });
      }
    }

    logEditorial("batch_rescue", {
      rescued: published,
      candidates: rescuable.length,
    });
  }

  const avgConfidence =
    confidenceScores.length > 0
      ? Math.round(
          (confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length) *
            1000
        ) / 1000
      : 0;

  let topStory: BatchEditorialResult["topStory"] = null;
  const bestFailed = [...failedCandidates].sort(
    (a, b) => b.quality.ai_confidence - a.quality.ai_confidence
  )[0];

  if (lastPublishedStory) {
    topStory = {
      storyId: lastPublishedStory.id,
      title: lastPublishedStory.title,
      confidence: lastPublishedStory.confidence,
    };
  } else if (bestFailed) {
    topStory = {
      storyId: null,
      title: bestFailed.draft.headline,
      confidence: bestFailed.quality.ai_confidence,
    };
  }

  logGenerationQualityMetrics(qualityMetrics, {
    published,
    rejected,
    repaired,
    skipped,
  });
  if (shouldRaiseGenerationQualityIncident(qualityMetrics)) {
    console.error(
      "[GENERATION_QUALITY_INCIDENT]",
      JSON.stringify({
        type: "REPEATED_GENERATION_VALIDATION_FAILURES",
        passRate: validationPassRate(qualityMetrics),
        ...qualityMetrics,
        ts: new Date().toISOString(),
      })
    );
  }

  const skipReasonCounts: Record<string, number> = {};
  for (const row of results) {
    if (row.ok || !row.reason) continue;
    skipReasonCounts[row.reason] = (skipReasonCounts[row.reason] ?? 0) + 1;
  }

  logEditorial("batch_complete", {
    published,
    rejected,
    repaired,
    skipped,
    updates,
    avgConfidence,
    topStory,
    qualityPassRate: validationPassRate(qualityMetrics),
    candidatePool,
    skipReasonCounts,
  });

  return {
    generated: published,
    rejected,
    published,
    repaired,
    skipped,
    updates,
    avgConfidence,
    topStory,
    errors,
    skipReasonCounts,
    candidatePool,
    qualityMetrics: {
      passRate: validationPassRate(qualityMetrics),
      titleFailure: qualityMetrics.titleFailure,
      bodyFailure: qualityMetrics.bodyFailure,
      missingSource: qualityMetrics.missingSource,
      duplicateRejection: qualityMetrics.duplicateRejection,
      languageFailure: qualityMetrics.languageFailure,
      retries: qualityMetrics.retries,
      quarantined: qualityMetrics.quarantined,
      manualReview: qualityMetrics.manualReview,
    },
    results,
  };
}
