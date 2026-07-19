/**
 * Editorial quality guards — production editorial intelligence + publish gates
 */

import {
  analyzeEditorialIntelligence,
  computeSourceOverlapScore,
  logQualityBreakdown,
  type EditorialIntelligenceResult,
  type PublishDecision,
} from "@/lib/news/ai/editorial-intelligence";
import {
  applyStructuralHardReject,
  validateGeneratedArticle,
} from "@/lib/news/ai/generated-article-validation";
import { normalizeTitle, titleSimilarity } from "@/lib/news/normalize";
import type { NewsEventRow } from "@/lib/types/newsroom";

const CLICKBAIT_RE =
  /\b(shocking|unbelievable|you won'?t believe|exposed|slams|destroys|बड़ा धमाका|चौंकाने|सनसनी|धमाकेदार)\b/i;

const UNVERIFIED_RE =
  /\b(allegedly|rumou?r|unconfirmed|speculation|sources say|experts believe|कहा जा रहा|अफवाह|अनौपचारिक)\b/i;

const UNSAFE_RE =
  /\b(kill\s+all|genocide|lynch|rape\s+video|child\s+porn|terror\s+how\s+to|बलात्कार\s+वीडियो)\b/i;

const NGRAM_SIZE = 7;
const DEFAULT_MIN_CONFIDENCE = 0.48;
const STRICT_MIN_CONFIDENCE = 0.62;
const MAX_SOURCE_PHRASE_OVERLAP_STRICT = 0.38;
const MAX_SOURCE_PHRASE_OVERLAP_TOLERANT = 0.55;
const BORDERLINE_WINDOW = 0.1;

export type SourceAttribution = {
  signal_id: string;
  source: string | null;
  provider: string;
  article_url: string;
  published_at: string | null;
  confidence: number;
};

export type QualityBreakdown = {
  structure: number;
  originality: number;
  readability: number;
  local_relevance: number;
  seo_quality: number;
  breaking_score?: number;
  trend_score?: number;
  headline_quality?: number;
  spam_score?: number;
  source_overlap?: number;
};

export type EditorialQualityReport = {
  passed: boolean;
  ai_confidence: number;
  source_overlap_score: number;
  duplicate_phrasing: string[];
  hallucination_flags: string[];
  clickbait_flags: string[];
  checks_run: string[];
  rejectionReasons: string[];
  quality_breakdown: QualityBreakdown;
  hard_reject: boolean;
  hard_reject_reasons: string[];
  borderline: boolean;
  should_repair: boolean;
  publish_allowed: boolean;
  publishDecision: PublishDecision;
  min_confidence_used: number;
  strict_mode: boolean;
  intelligence: EditorialIntelligenceResult;
  duplicate_cluster_id: string | null;
};

export type EditorialDecisionLog = {
  confidence: number;
  readability: number;
  seoQuality: number;
  localRelevance: number;
  originality: number;
  publishDecision: PublishDecision;
  accepted: boolean;
  rejectionReasons: string[];
  storyId: string | null;
  title: string;
  eventId?: string;
  repaired?: boolean;
  batchRescue?: boolean;
  breakingScore?: number;
  trendScore?: number;
  duplicateClusterId?: string | null;
  quality_breakdown?: QualityBreakdown;
};

export type EditorialThresholds = {
  minConfidence: number;
  strictMode: boolean;
  maxSourceOverlap: number;
  maxDuplicatePhrases: number;
  maxNumericDrift: number;
};

export function getEditorialThresholds(): EditorialThresholds {
  const strictMode =
    process.env.AI_EDITORIAL_STRICT_MODE?.trim().toLowerCase() === "true";

  const envMin = parseFloat(
    process.env.AI_EDITORIAL_MIN_CONFIDENCE?.trim() ?? ""
  );
  const minConfidence = strictMode
    ? STRICT_MIN_CONFIDENCE
    : Number.isFinite(envMin) && envMin > 0 && envMin < 1
      ? envMin
      : DEFAULT_MIN_CONFIDENCE;

  return {
    minConfidence,
    strictMode,
    maxSourceOverlap: strictMode
      ? MAX_SOURCE_PHRASE_OVERLAP_STRICT
      : MAX_SOURCE_PHRASE_OVERLAP_TOLERANT,
    maxDuplicatePhrases: strictMode ? 0 : 3,
    maxNumericDrift: strictMode ? 2 : 6,
  };
}

export function extractNGrams(text: string, n = NGRAM_SIZE): Set<string> {
  const tokens = normalizeTitle(text).split(/\s+/).filter((w) => w.length > 2);
  const grams = new Set<string>();
  for (let i = 0; i <= tokens.length - n; i++) {
    grams.add(tokens.slice(i, i + n).join(" "));
  }
  return grams;
}

export function findDuplicatePhrasing(
  draftText: string,
  sourceTexts: string[]
): string[] {
  const draftGrams = extractNGrams(draftText);
  const hits: string[] = [];

  for (const source of sourceTexts) {
    const sourceGrams = extractNGrams(source);
    for (const g of sourceGrams) {
      if (g.length < 12) continue;
      if (draftGrams.has(g) && !hits.includes(g)) {
        hits.push(g);
        if (hits.length >= 8) return hits;
      }
    }
  }

  return hits;
}

export { computeSourceOverlapScore } from "@/lib/news/ai/editorial-intelligence";

export function detectHallucinationFlags(
  draftText: string,
  factPackText: string
): string[] {
  const flags: string[] = [];

  if (UNVERIFIED_RE.test(draftText)) {
    flags.push("unverified_claim_language");
  }
  if (CLICKBAIT_RE.test(draftText)) {
    flags.push("clickbait_tone");
  }

  const draftNumbers = draftText.match(/\b\d{2,4}(%|k|m|cr|lakh)?\b/gi) ?? [];
  const factNumbers = new Set(
    (factPackText.match(/\b\d{2,4}(%|k|m|cr|lakh)?\b/gi) ?? []).map((n) =>
      n.toLowerCase()
    )
  );

  for (const num of draftNumbers) {
    if (!factNumbers.has(num.toLowerCase())) {
      flags.push(`numeric_claim_not_in_sources:${num}`);
      if (flags.length >= 8) break;
    }
  }

  return flags;
}

export function isDuplicateGeneratedStory(
  headline: string,
  existingHeadlines: string[]
): boolean {
  const norm = normalizeTitle(headline);
  for (const existing of existingHeadlines) {
    if (titleSimilarity(norm, normalizeTitle(existing)) >= 0.88) {
      return true;
    }
  }
  return false;
}

function detectHardRejects(input: {
  headline: string;
  summary: string;
  articleBody: string;
  unsafeText: string;
  hallucination_flags: string[];
  duplicateStory: boolean;
  isSpam: boolean;
  thresholds: EditorialThresholds;
}): string[] {
  const reasons: string[] = [];
  const body = input.articleBody.trim();
  const bodyWords = body.split(/\s+/).filter(Boolean).length;

  if (!input.headline?.trim() || input.headline.trim().length < 4) {
    reasons.push("empty_headline");
  }
  if (!input.summary?.trim() || input.summary.trim().length < 12) {
    reasons.push("empty_summary");
  }
  if (bodyWords < 35 && body.length < 80) {
    reasons.push("empty_content");
  }

  if (input.thresholds.strictMode) {
    if (!body.includes("##") && bodyWords < 120) {
      reasons.push("malformed_structure");
    }
  } else if (bodyWords < 25 && body.length < 50) {
    reasons.push("malformed_structure");
  }

  if (UNSAFE_RE.test(input.unsafeText)) {
    reasons.push("unsafe_content");
  }

  if (input.isSpam) {
    reasons.push("spam_like_content");
  }

  const numericDrift = input.hallucination_flags.filter((f) =>
    f.startsWith("numeric_claim")
  ).length;
  if (numericDrift > input.thresholds.maxNumericDrift) {
    reasons.push("hallucinated_numeric_claims");
  }

  if (input.duplicateStory) {
    reasons.push("duplicate_generated_story");
  }

  return reasons;
}

export function logEditorialDecision(decision: EditorialDecisionLog): void {
  const payload = {
    type: "EDITORIAL_DECISION",
    ...decision,
    ts: new Date().toISOString(),
  };
  console.log("[EDITORIAL_DECISION]", JSON.stringify(payload));
}

function intelligenceToQualityBreakdown(
  intel: EditorialIntelligenceResult
): QualityBreakdown {
  return {
    structure: intel.structure,
    originality: intel.originality,
    readability: intel.readability,
    local_relevance: intel.localRelevance,
    seo_quality: intel.seoQuality,
    breaking_score: intel.breakingScore,
    trend_score: intel.trendScore,
    headline_quality: intel.headlineQuality,
    spam_score: intel.spamScore,
    source_overlap: intel.quality_breakdown.sourceOverlap,
  };
}

export function runEditorialQualityChecks(input: {
  headline: string;
  summary: string;
  articleBody: string;
  seoTitle: string;
  seoDescription: string;
  sourceTexts: string[];
  factPackText: string;
  sourceCount: number;
  region?: string | null;
  category?: string | null;
  language?: string;
  existingHeadlines?: string[];
  existingBodyFingerprints?: string[];
  existingEventIds?: string[];
  forcePublish?: boolean;
  event?: NewsEventRow | null;
}): EditorialQualityReport {
  const thresholds = getEditorialThresholds();
  const draftText = [
    input.headline,
    input.summary,
    input.articleBody,
    input.seoTitle,
    input.seoDescription,
  ].join("\n");

  const structural = validateGeneratedArticle({
    headline: input.headline,
    summary: input.summary,
    articleBody: input.articleBody,
    language: input.language,
    category: input.category ?? input.event?.category,
    region: input.region ?? input.event?.region,
    eventId: input.event?.id,
    existingHeadlines: input.existingHeadlines,
    existingBodyFingerprints: input.existingBodyFingerprints,
    existingEventIds: input.existingEventIds,
    stage: "draft",
  });

  const duplicate_phrasing = findDuplicatePhrasing(draftText, input.sourceTexts);
  const source_overlap_score = computeSourceOverlapScore(
    draftText,
    input.sourceTexts
  );
  const hallucination_flags = detectHallucinationFlags(
    draftText,
    input.factPackText
  );
  const clickbait_flags = hallucination_flags.filter((f) =>
    f.includes("clickbait")
  );

  const intelligence = analyzeEditorialIntelligence(
    {
      headline: input.headline,
      summary: input.summary,
      articleBody: input.articleBody,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      sourceTexts: input.sourceTexts,
      factPackText: input.factPackText,
      sourceCount: input.sourceCount,
      region: input.region,
      category: input.category,
      language: input.language,
      existingHeadlines: input.existingHeadlines,
      event: input.event,
    },
    {
      sourceOverlap: source_overlap_score,
      duplicatePhraseCount: duplicate_phrasing.length,
    }
  );

  let ai_confidence = intelligence.confidence;
  ai_confidence -= intelligence.spamScore * 0.2;
  ai_confidence -= duplicate_phrasing.length * (thresholds.strictMode ? 0.06 : 0.025);
  ai_confidence -= hallucination_flags.filter((f) => !f.includes("clickbait")).length *
    (thresholds.strictMode ? 0.08 : 0.03);
  ai_confidence = Math.max(0, Math.min(1, Math.round(ai_confidence * 1000) / 1000));

  const duplicateStory =
    intelligence.duplicateCluster !== null &&
    intelligence.duplicateCluster.similarity >= 0.88;

  const hard_reject_reasons = applyStructuralHardReject(
    detectHardRejects({
      headline: input.headline,
      summary: input.summary,
      articleBody: input.articleBody,
      unsafeText: draftText,
      hallucination_flags,
      duplicateStory,
      isSpam: intelligence.isSpam,
      thresholds,
    }),
    structural
  );

  const hard_reject = hard_reject_reasons.length > 0;
  const rejectionReasons: string[] = [...hard_reject_reasons];

  if (!hard_reject) {
    if (ai_confidence < thresholds.minConfidence) {
      rejectionReasons.push("confidence_below_threshold");
    }
    if (duplicate_phrasing.length > thresholds.maxDuplicatePhrases) {
      rejectionReasons.push("excessive_source_phrasing");
    }
    if (source_overlap_score > thresholds.maxSourceOverlap) {
      rejectionReasons.push("high_source_overlap");
    }
    if (intelligence.readability < 0.38) {
      rejectionReasons.push("low_readability");
    }
    if (intelligence.seoQuality < 0.35) {
      rejectionReasons.push("low_seo_quality");
    }
    if (
      thresholds.strictMode &&
      clickbait_flags.length > 0
    ) {
      rejectionReasons.push("clickbait_tone");
    }
    if (intelligence.headlineQuality < 0.32) {
      rejectionReasons.push("weak_headline");
    }
  }

  const borderline =
    !hard_reject &&
    ai_confidence >= thresholds.minConfidence - BORDERLINE_WINDOW &&
    ai_confidence < thresholds.minConfidence + 0.04;

  const should_repair =
    !hard_reject &&
    (borderline ||
      rejectionReasons.includes("low_readability") ||
      rejectionReasons.includes("weak_headline") ||
      rejectionReasons.includes("low_seo_quality") ||
      (ai_confidence < thresholds.minConfidence &&
        ai_confidence >= thresholds.minConfidence - BORDERLINE_WINDOW));

  let publish_allowed =
    !hard_reject &&
    ai_confidence >= thresholds.minConfidence &&
    duplicate_phrasing.length <= thresholds.maxDuplicatePhrases &&
    source_overlap_score <= thresholds.maxSourceOverlap &&
    !intelligence.isSpam;

  if (thresholds.strictMode) {
    publish_allowed =
      publish_allowed &&
      duplicate_phrasing.length === 0 &&
      clickbait_flags.length === 0 &&
      intelligence.readability >= 0.45;
  }

  // forcePublish may bypass soft quality gates only — never structural hard rejects
  if (input.forcePublish && !hard_reject) {
    publish_allowed = true;
    rejectionReasons.length = 0;
  }

  let publishDecision: PublishDecision = "reject";
  if (publish_allowed) publishDecision = "publish";
  else if (should_repair && !hard_reject) publishDecision = "repair";

  const passed = publish_allowed;
  const quality_breakdown = intelligenceToQualityBreakdown(intelligence);

  const report: EditorialQualityReport = {
    passed,
    ai_confidence,
    source_overlap_score: Math.round(source_overlap_score * 1000) / 1000,
    duplicate_phrasing,
    hallucination_flags,
    clickbait_flags,
    checks_run: [
      ...intelligence.checks_run,
      "ngram_duplicate_phrasing",
      "unverified_language",
      "numeric_fact_alignment",
      "hard_reject_gate",
      "phase5_structural_validation",
      thresholds.strictMode ? "strict_mode" : "production_tolerant",
    ],
    rejectionReasons,
    quality_breakdown,
    hard_reject,
    hard_reject_reasons,
    borderline,
    should_repair,
    publish_allowed,
    publishDecision,
    min_confidence_used: thresholds.minConfidence,
    strict_mode: thresholds.strictMode,
    intelligence: { ...intelligence, confidence: ai_confidence },
    duplicate_cluster_id: intelligence.duplicateCluster?.clusterId ?? null,
  };

  logQualityBreakdown({
    eventId: input.event?.id,
    title: input.headline,
    intelligence: report.intelligence,
    publishDecision,
    rejectionReasons,
  });

  return report;
}

/** @deprecated use getEditorialThresholds().minConfidence */
export const MIN_CONFIDENCE_TO_FINALIZE = DEFAULT_MIN_CONFIDENCE;
export const MAX_SOURCE_PHRASE_OVERLAP = MAX_SOURCE_PHRASE_OVERLAP_STRICT;
