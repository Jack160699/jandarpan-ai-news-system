/**
 * Production-grade editorial intelligence — scoring, clustering, spam gates
 */

import {
  cosineSimilarity,
  tokenizeForSimilarity,
  buildTfIdfVector,
  computeIdf,
} from "@/lib/news/ai/similarity";
import { normalizeTitle, titleSimilarity } from "@/lib/news/normalize";
import { scoreRegionalTopic } from "@/lib/regional/topic-scoring";
import type { NewsEventRow } from "@/lib/types/newsroom";

const BREAKING_RE =
  /\b(breaking|live|urgent|exclusive|alert|ब्रेकिंग|लाइव|ताजा|बड़ी खबर)\b/i;

const CLICKBAIT_RE =
  /\b(shocking|unbelievable|you won'?t believe|exposed|slams|destroys|बड़ा धमाका|चौंकाने|सनसनी|धमाकेदार)\b/i;

const SPAM_RE =
  /\b(click here|buy now|free money|crypto giveaway|casino|viagra|loan approved|earn \$|whatsapp group join)\b/i;

const CG_REGIONAL_RE =
  /chhattisgarh|छत्तीसगढ|raipur|रायपुर|bastar|बस्तर|bilaspur|durg|korba|jagdalpur|naxal|बिलासपुर/i;

export type DuplicateClusterMatch = {
  clusterId: string;
  clusterSize: number;
  nearestHeadline: string | null;
  similarity: number;
};

export type EditorialIntelligenceInput = {
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
  event?: NewsEventRow | null;
  publishedAt?: string | null;
};

export type EditorialIntelligenceScores = {
  confidence: number;
  readability: number;
  seoQuality: number;
  localRelevance: number;
  originality: number;
  breakingScore: number;
  trendScore: number;
  structure: number;
  headlineQuality: number;
};

export type EditorialIntelligenceBreakdown = EditorialIntelligenceScores & {
  spamScore: number;
  sourceOverlap: number;
  duplicatePhraseCount: number;
};

export type PublishDecision = "publish" | "repair" | "reject";

export type EditorialIntelligenceResult = EditorialIntelligenceScores & {
  publishDecision: PublishDecision;
  duplicateCluster: DuplicateClusterMatch | null;
  spamScore: number;
  isSpam: boolean;
  spamFlags: string[];
  quality_breakdown: EditorialIntelligenceBreakdown;
  checks_run: string[];
};

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, round3(n)));
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function sentences(text: string): string[] {
  return text
    .split(/[.!?।]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8);
}

/** Assign duplicate cluster against existing published headlines */
export function assignDuplicateCluster(
  headline: string,
  existingHeadlines: string[]
): DuplicateClusterMatch | null {
  const norm = normalizeTitle(headline);
  let bestSim = 0;
  let nearest: string | null = null;
  let clusterId: string | null = null;

  const clusters = new Map<string, string[]>();

  for (const existing of existingHeadlines) {
    const sim = titleSimilarity(norm, normalizeTitle(existing));
    if (sim > bestSim) {
      bestSim = sim;
      nearest = existing;
    }
    if (sim >= 0.78) {
      const key = normalizeTitle(existing).slice(0, 32);
      const list = clusters.get(key) ?? [];
      list.push(existing);
      clusters.set(key, list);
    }
  }

  if (bestSim >= 0.88) {
    const key = nearest ? normalizeTitle(nearest).slice(0, 32) : norm.slice(0, 32);
    const siblings = clusters.get(key) ?? (nearest ? [nearest] : []);
    clusterId = `dup-${key.replace(/\s+/g, "-")}`;
    return {
      clusterId,
      clusterSize: siblings.length + 1,
      nearestHeadline: nearest,
      similarity: round3(bestSim),
    };
  }

  if (bestSim >= 0.78) {
    return {
      clusterId: `dup-near-${norm.slice(0, 12)}`,
      clusterSize: 2,
      nearestHeadline: nearest,
      similarity: round3(bestSim),
    };
  }

  return null;
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
  return clamp01(cosineSimilarity(draftVec, sourceVec));
}

export function scoreHeadlineQuality(headline: string): number {
  const t = headline.trim();
  if (!t || t.length < 8) return 0.2;

  let score = 0.55;
  const words = wordCount(t);

  if (words >= 5 && words <= 14) score += 0.2;
  else if (words >= 4 && words <= 18) score += 0.1;
  else score -= 0.15;

  if (t.length >= 24 && t.length <= 90) score += 0.12;
  if (CLICKBAIT_RE.test(t)) score -= 0.35;
  if (/[!?]{2,}/.test(t)) score -= 0.2;
  if (t === t.toUpperCase() && t.length > 20) score -= 0.25;
  if (/^[\d\s\-:]+$/.test(t)) score -= 0.4;

  return clamp01(score);
}

export function scoreReadability(input: {
  summary: string;
  articleBody: string;
  language?: string;
}): number {
  const body = input.articleBody.trim();
  const wc = wordCount(body);
  const sents = sentences(body);
  const avgLen =
    sents.length > 0
      ? sents.reduce((a, s) => a + wordCount(s), 0) / sents.length
      : wc;

  let score = 0.4;
  if (wc >= 80) score += 0.2;
  if (wc >= 180) score += 0.1;
  if (input.summary.length >= 50) score += 0.15;
  if (avgLen >= 8 && avgLen <= 24) score += 0.15;
  else if (avgLen > 32) score -= 0.12;

  const sectionCount = (body.match(/^##\s/mg) ?? []).length;
  if (sectionCount >= 2) score += 0.12;
  if (sectionCount >= 3) score += 0.08;

  return clamp01(score);
}

export function scoreSeoQuality(input: {
  headline: string;
  seoTitle: string;
  seoDescription: string;
  summary: string;
}): number {
  let score = 0.35;
  const title = (input.seoTitle || input.headline).trim();

  if (title.length >= 20 && title.length <= 65) score += 0.25;
  else if (title.length >= 12) score += 0.1;

  const desc = (input.seoDescription || input.summary).trim();
  if (desc.length >= 120 && desc.length <= 165) score += 0.28;
  else if (desc.length >= 60) score += 0.15;

  if (input.headline.length >= 10) score += 0.1;
  if (!CLICKBAIT_RE.test(title)) score += 0.08;

  return clamp01(score);
}

export function scoreLocalRelevance(input: {
  headline: string;
  summary: string;
  articleBody: string;
  region?: string | null;
  category?: string | null;
}): number {
  const topic = scoreRegionalTopic({
    headline: input.headline,
    summary: input.summary,
    articleBody: input.articleBody,
    region: input.region,
    category: input.category,
  });
  const blob = `${input.headline} ${input.summary} ${input.articleBody}`.toLowerCase();
  let score = topic.localRelevance;

  if (input.region === "chhattisgarh") score = Math.max(score, 0.72);
  if (input.category === "local") score += 0.08;
  if (CG_REGIONAL_RE.test(blob)) score += 0.1;

  return clamp01(score);
}

export function scoreOriginality(
  overlapScore: number,
  duplicatePhraseCount: number
): number {
  const dupPenalty = Math.min(0.45, duplicatePhraseCount * 0.06);
  return clamp01(1 - overlapScore * 1.1 - dupPenalty);
}

export function scoreBreaking(input: {
  headline: string;
  summary: string;
  event?: NewsEventRow | null;
  publishedAt?: string | null;
}): number {
  const text = `${input.headline} ${input.summary}`;
  let score = BREAKING_RE.test(text) ? 0.72 : 0.15;

  const urgency = input.event?.urgency_score ?? 0;
  if (urgency >= 0.75) score += 0.18;
  else if (urgency >= 0.5) score += 0.08;

  if (input.publishedAt) {
    const hours =
      (Date.now() - new Date(input.publishedAt).getTime()) / 3_600_000;
    if (hours <= 3) score += 0.12;
    else if (hours <= 8) score += 0.05;
  }

  return clamp01(score);
}

export function scoreTrend(input: {
  sourceCount: number;
  headline: string;
  event?: NewsEventRow | null;
}): number {
  let score = Math.min(0.45, input.sourceCount * 0.1);
  const signalCount = input.event?.signal_ids?.length ?? input.sourceCount;
  if (signalCount >= 4) score += 0.22;
  else if (signalCount >= 2) score += 0.12;

  if ((input.event?.event_summary?.length ?? 0) > 80) score += 0.08;
  if (BREAKING_RE.test(input.headline)) score += 0.1;

  return clamp01(score);
}

export function scoreStructure(articleBody: string): number {
  const body = articleBody.trim();
  const sectionCount = (body.match(/^##\s/mg) ?? []).length;
  const wc = wordCount(body);

  if (sectionCount >= 3 && wc >= 120) return 0.92;
  if (sectionCount >= 2 && wc >= 80) return 0.78;
  if (sectionCount >= 1 && wc >= 60) return 0.65;
  if (wc >= 80) return 0.55;
  return wc >= 40 ? 0.42 : 0.28;
}

export function detectSpamSignals(input: {
  headline: string;
  summary: string;
  articleBody: string;
}): { spamScore: number; flags: string[] } {
  const flags: string[] = [];
  const blob = `${input.headline} ${input.summary} ${input.articleBody}`;
  let score = 0;

  if (SPAM_RE.test(blob)) {
    flags.push("spam_keyword_pattern");
    score += 0.55;
  }

  const urls = blob.match(/https?:\/\//gi)?.length ?? 0;
  if (urls >= 4) {
    flags.push("excessive_urls");
    score += 0.25;
  }

  const headline = input.headline.trim();
  if (headline.length > 10 && headline === headline.toUpperCase()) {
    flags.push("all_caps_headline");
    score += 0.2;
  }

  if (/(.)\1{5,}/.test(blob)) {
    flags.push("repeated_character_noise");
    score += 0.3;
  }

  const words = blob.split(/\s+/).filter(Boolean);
  const unique = new Set(words.map((w) => w.toLowerCase()));
  if (words.length > 30 && unique.size / words.length < 0.35) {
    flags.push("low_lexical_diversity");
    score += 0.25;
  }

  if (wordCount(input.articleBody) < 25 && wordCount(input.summary) < 15) {
    flags.push("thin_content");
    score += 0.2;
  }

  return { spamScore: clamp01(score), flags };
}

export function computeEditorialConfidence(scores: EditorialIntelligenceScores): number {
  const weighted =
    scores.structure * 0.14 +
    scores.originality * 0.18 +
    scores.readability * 0.16 +
    scores.localRelevance * 0.14 +
    scores.seoQuality * 0.12 +
    scores.headlineQuality * 0.12 +
    scores.trendScore * 0.08 +
    scores.breakingScore * 0.06;

  return clamp01(weighted);
}

export function analyzeEditorialIntelligence(
  input: EditorialIntelligenceInput,
  options?: {
    sourceOverlap?: number;
    duplicatePhraseCount?: number;
  }
): EditorialIntelligenceResult {
  const draftText = [
    input.headline,
    input.summary,
    input.articleBody,
    input.seoTitle,
    input.seoDescription,
  ].join("\n");

  const sourceOverlap =
    options?.sourceOverlap ??
    computeSourceOverlapScore(draftText, input.sourceTexts);
  const duplicatePhraseCount = options?.duplicatePhraseCount ?? 0;

  const duplicateCluster = assignDuplicateCluster(
    input.headline,
    input.existingHeadlines ?? []
  );

  const spam = detectSpamSignals({
    headline: input.headline,
    summary: input.summary,
    articleBody: input.articleBody,
  });

  const structure = round3(scoreStructure(input.articleBody));
  const readability = scoreReadability({
    summary: input.summary,
    articleBody: input.articleBody,
    language: input.language,
  });
  const seoQuality = scoreSeoQuality({
    headline: input.headline,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    summary: input.summary,
  });
  const localRelevance = scoreLocalRelevance({
    headline: input.headline,
    summary: input.summary,
    articleBody: input.articleBody,
    region: input.region,
    category: input.category,
  });
  const originality = scoreOriginality(sourceOverlap, duplicatePhraseCount);
  const headlineQuality = scoreHeadlineQuality(input.headline);
  const breakingScore = scoreBreaking({
    headline: input.headline,
    summary: input.summary,
    event: input.event,
    publishedAt: input.publishedAt,
  });
  const trendScore = scoreTrend({
    sourceCount: input.sourceCount,
    headline: input.headline,
    event: input.event,
  });

  const scores: EditorialIntelligenceScores = {
    structure: round3(structure),
    readability,
    seoQuality,
    localRelevance,
    originality,
    headlineQuality,
    breakingScore,
    trendScore,
    confidence: 0,
  };

  scores.confidence = computeEditorialConfidence(scores);

  const quality_breakdown: EditorialIntelligenceBreakdown = {
    ...scores,
    spamScore: spam.spamScore,
    sourceOverlap: round3(sourceOverlap),
    duplicatePhraseCount,
  };

  const isSpam = spam.spamScore >= 0.55 || spam.flags.includes("spam_keyword_pattern");

  return {
    ...scores,
    publishDecision: "reject",
    duplicateCluster,
    spamScore: spam.spamScore,
    isSpam,
    spamFlags: spam.flags,
    quality_breakdown,
    checks_run: [
      "duplicate_clustering",
      "headline_quality",
      "readability_scoring",
      "seo_scoring",
      "regional_relevance",
      "breaking_scoring",
      "trend_scoring",
      "spam_detection",
      "confidence_synthesis",
    ],
  };
}

export function logQualityBreakdown(payload: {
  eventId?: string;
  storyId?: string | null;
  title: string;
  intelligence: EditorialIntelligenceResult;
  publishDecision: PublishDecision;
  rejectionReasons?: string[];
}): void {
  const entry = {
    type: "QUALITY_BREAKDOWN",
    ts: new Date().toISOString(),
    eventId: payload.eventId,
    storyId: payload.storyId,
    title: payload.title,
    publishDecision: payload.publishDecision,
    confidence: payload.intelligence.confidence,
    readability: payload.intelligence.readability,
    seoQuality: payload.intelligence.seoQuality,
    localRelevance: payload.intelligence.localRelevance,
    originality: payload.intelligence.originality,
    breakingScore: payload.intelligence.breakingScore,
    trendScore: payload.intelligence.trendScore,
    headlineQuality: payload.intelligence.headlineQuality,
    structure: payload.intelligence.structure,
    spamScore: payload.intelligence.spamScore,
    duplicateClusterId: payload.intelligence.duplicateCluster?.clusterId ?? null,
    rejectionReasons: payload.rejectionReasons ?? [],
    breakdown: payload.intelligence.quality_breakdown,
  };
  console.log("[QUALITY_BREAKDOWN]", JSON.stringify(entry));
}
