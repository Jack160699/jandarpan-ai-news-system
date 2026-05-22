/**
 * Editorial quality guards — production-tolerant regional newsroom validation
 */

import {
  cosineSimilarity,
  tokenizeForSimilarity,
  buildTfIdfVector,
  computeIdf,
} from "@/lib/news/ai/similarity";
import { normalizeTitle, titleSimilarity } from "@/lib/news/normalize";

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
  min_confidence_used: number;
  strict_mode: boolean;
};

export type EditorialDecisionLog = {
  confidence: number;
  accepted: boolean;
  rejectionReasons: string[];
  storyId: string | null;
  title: string;
  eventId?: string;
  repaired?: boolean;
  batchRescue?: boolean;
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

export function computeSourceOverlapScore(
  draftText: string,
  sourceTexts: string[]
): number {
  const combined = sourceTexts.join(" ");
  if (!combined.trim()) return 0;

  const draftTokens = tokenizeForSimilarity(draftText);
  const sourceTokens = tokenizeForSimilarity(combined);
  const idf = computeIdf([draftTokens, sourceTokens]);
  const draftVec = buildTfIdfVector(draftTokens, idf);
  const sourceVec = buildTfIdfVector(sourceTokens, idf);
  return cosineSimilarity(draftVec, sourceVec);
}

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

export function computeAiConfidence(input: {
  sourceCount: number;
  overlapScore: number;
  duplicateCount: number;
  hallucinationCount: number;
  clickbaitCount: number;
  breakdown: QualityBreakdown;
  thresholds: EditorialThresholds;
}): number {
  const avgBreakdown =
    (input.breakdown.structure +
      input.breakdown.originality +
      input.breakdown.readability +
      input.breakdown.local_relevance +
      input.breakdown.seo_quality) /
    5;

  let score = 0.38 + avgBreakdown * 0.35;
  score += Math.min(0.18, input.sourceCount * 0.06);
  score += Math.max(0, 0.12 - input.overlapScore * 0.22);
  score -= input.duplicateCount * (input.thresholds.strictMode ? 0.08 : 0.03);
  score -= input.hallucinationCount * (input.thresholds.strictMode ? 0.1 : 0.04);
  score -= input.clickbaitCount * (input.thresholds.strictMode ? 0.12 : 0.05);

  return Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
}

export function buildQualityBreakdown(input: {
  headline: string;
  summary: string;
  articleBody: string;
  seoTitle: string;
  seoDescription: string;
  sourceCount: number;
  overlapScore: number;
  duplicateCount: number;
  region?: string | null;
  category?: string | null;
  language?: string;
}): QualityBreakdown {
  const body = input.articleBody.trim();
  const sectionCount = (body.match(/^##\s/mg) ?? []).length;
  const wordCount = body.split(/\s+/).filter(Boolean).length;

  const structure =
    sectionCount >= 3
      ? 0.9
      : sectionCount >= 1
        ? 0.72
        : wordCount >= 80
          ? 0.55
          : 0.35;

  const originality = Math.max(
    0.25,
    Math.min(1, 1 - input.overlapScore * (input.duplicateCount > 2 ? 1.2 : 1))
  );

  const readability =
    input.summary.length >= 40 && wordCount >= 60
      ? 0.85
      : input.summary.length >= 20
        ? 0.68
        : 0.45;

  const regionalText = `${input.headline} ${input.summary} ${body}`.toLowerCase();
  const localHints =
    /chhattisgarh|छत्तीसगढ|raipur|रायपुर|bastar|बस्तर|bilaspur|durg|korba|jagdalpur/i;
  const local_relevance =
    input.region === "chhattisgarh" || localHints.test(regionalText)
      ? 0.88
      : input.category === "local"
        ? 0.75
        : 0.55;

  const seo_quality =
    input.seoTitle.length >= 12 &&
    input.seoDescription.length >= 40 &&
    input.headline.length >= 8
      ? 0.82
      : 0.5;

  return {
    structure: Math.round(structure * 1000) / 1000,
    originality: Math.round(originality * 1000) / 1000,
    readability: Math.round(readability * 1000) / 1000,
    local_relevance: Math.round(local_relevance * 1000) / 1000,
    seo_quality: Math.round(seo_quality * 1000) / 1000,
  };
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
  forcePublish?: boolean;
}): EditorialQualityReport {
  const thresholds = getEditorialThresholds();
  const draftText = [
    input.headline,
    input.summary,
    input.articleBody,
    input.seoTitle,
    input.seoDescription,
  ].join("\n");

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

  const quality_breakdown = buildQualityBreakdown({
    headline: input.headline,
    summary: input.summary,
    articleBody: input.articleBody,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    sourceCount: input.sourceCount,
    overlapScore: source_overlap_score,
    duplicateCount: duplicate_phrasing.length,
    region: input.region,
    category: input.category,
    language: input.language,
  });

  const ai_confidence = computeAiConfidence({
    sourceCount: input.sourceCount,
    overlapScore: source_overlap_score,
    duplicateCount: duplicate_phrasing.length,
    hallucinationCount: hallucination_flags.filter(
      (f) => !f.includes("clickbait")
    ).length,
    clickbaitCount: clickbait_flags.length,
    breakdown: quality_breakdown,
    thresholds,
  });

  const duplicateStory = isDuplicateGeneratedStory(
    input.headline,
    input.existingHeadlines ?? []
  );

  const hard_reject_reasons = detectHardRejects({
    headline: input.headline,
    summary: input.summary,
    articleBody: input.articleBody,
    unsafeText: draftText,
    hallucination_flags,
    duplicateStory,
    thresholds,
  });

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
    if (
      thresholds.strictMode &&
      clickbait_flags.length > 0
    ) {
      rejectionReasons.push("clickbait_tone");
    }
  }

  const borderline =
    !hard_reject &&
    ai_confidence >= thresholds.minConfidence - BORDERLINE_WINDOW &&
    ai_confidence < thresholds.minConfidence + 0.04;

  const should_repair =
    !hard_reject &&
    (borderline ||
      (ai_confidence < thresholds.minConfidence &&
        ai_confidence >= thresholds.minConfidence - BORDERLINE_WINDOW));

  let publish_allowed =
    !hard_reject &&
    ai_confidence >= thresholds.minConfidence &&
    duplicate_phrasing.length <= thresholds.maxDuplicatePhrases &&
    source_overlap_score <= thresholds.maxSourceOverlap;

  if (thresholds.strictMode) {
    publish_allowed =
      publish_allowed &&
      duplicate_phrasing.length === 0 &&
      !clickbait_flags.length;
  }

  if (input.forcePublish && !hard_reject) {
    publish_allowed = true;
    rejectionReasons.length = 0;
  }

  const passed = publish_allowed;

  return {
    passed,
    ai_confidence,
    source_overlap_score: Math.round(source_overlap_score * 1000) / 1000,
    duplicate_phrasing,
    hallucination_flags,
    clickbait_flags,
    checks_run: [
      "ngram_duplicate_phrasing",
      "tfidf_source_overlap",
      "unverified_language",
      "clickbait_tone",
      "numeric_fact_alignment",
      "confidence_scoring",
      "quality_breakdown",
      "hard_reject_gate",
      thresholds.strictMode ? "strict_mode" : "production_tolerant",
    ],
    rejectionReasons,
    quality_breakdown,
    hard_reject,
    hard_reject_reasons,
    borderline,
    should_repair,
    publish_allowed,
    min_confidence_used: thresholds.minConfidence,
    strict_mode: thresholds.strictMode,
  };
}

/** @deprecated use getEditorialThresholds().minConfidence */
export const MIN_CONFIDENCE_TO_FINALIZE = DEFAULT_MIN_CONFIDENCE;
export const MAX_SOURCE_PHRASE_OVERLAP = MAX_SOURCE_PHRASE_OVERLAP_STRICT;
