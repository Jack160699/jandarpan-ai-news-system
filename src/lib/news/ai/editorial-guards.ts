/**
 * Editorial quality guards — hallucination + duplicate phrasing prevention
 */

import { cosineSimilarity, tokenizeForSimilarity, buildTfIdfVector, computeIdf } from "@/lib/news/ai/similarity";
import { normalizeTitle } from "@/lib/news/normalize";

const CLICKBAIT_RE =
  /\b(shocking|unbelievable|you won'?t believe|exposed|slams|destroys|बड़ा धमाका|चौंकाने|सनसनी|धमाकेदार)\b/i;

const UNVERIFIED_RE =
  /\b(allegedly|rumou?r|unconfirmed|speculation|sources say|experts believe|कहा जा रहा|अफवाह|अनौपचारिक)\b/i;

const NGRAM_SIZE = 7;
const MAX_SOURCE_PHRASE_OVERLAP = 0.38;
const MIN_CONFIDENCE_TO_FINALIZE = 0.62;

export type SourceAttribution = {
  signal_id: string;
  source: string | null;
  provider: string;
  article_url: string;
  published_at: string | null;
  confidence: number;
};

export type EditorialQualityReport = {
  passed: boolean;
  ai_confidence: number;
  source_overlap_score: number;
  duplicate_phrasing: string[];
  hallucination_flags: string[];
  clickbait_flags: string[];
  checks_run: string[];
};

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
        if (hits.length >= 5) return hits;
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
      if (flags.length >= 4) break;
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
}): number {
  let score = 0.45;
  score += Math.min(0.25, input.sourceCount * 0.08);
  score += Math.max(0, 0.2 - input.overlapScore * 0.5);
  score -= input.duplicateCount * 0.06;
  score -= input.hallucinationCount * 0.08;
  score -= input.clickbaitCount * 0.12;
  return Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
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
}): EditorialQualityReport {
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
    f.includes("clickbait") || CLICKBAIT_RE.test(f)
  );

  const ai_confidence = computeAiConfidence({
    sourceCount: input.sourceCount,
    overlapScore: source_overlap_score,
    duplicateCount: duplicate_phrasing.length,
    hallucinationCount: hallucination_flags.filter(
      (f) => !f.includes("clickbait")
    ).length,
    clickbaitCount: clickbait_flags.length,
  });

  const passed =
    ai_confidence >= MIN_CONFIDENCE_TO_FINALIZE &&
    duplicate_phrasing.length === 0 &&
    source_overlap_score <= MAX_SOURCE_PHRASE_OVERLAP &&
    !hallucination_flags.some((f) => f.includes("clickbait")) &&
    hallucination_flags.filter((f) => f.startsWith("numeric_claim")).length <=
      2;

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
    ],
  };
}

export { MIN_CONFIDENCE_TO_FINALIZE, MAX_SOURCE_PHRASE_OVERLAP };
