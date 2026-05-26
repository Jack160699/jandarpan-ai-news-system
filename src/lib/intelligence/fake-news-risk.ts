/**
 * Fake news / misinformation risk scoring (heuristic + editorial signals)
 */

import type { FakeNewsRisk, RiskLevel } from "@/lib/intelligence/types";

const CLICKBAIT_RE =
  /\b(shocking|unbelievable|you won'?t believe|exposed|slams|destroys|बड़ा धमाका|सनसनी|धमाकेदार|viral video)\b/i;

const UNVERIFIED_RE =
  /\b(unconfirmed|rumou?r|allegedly|sources say|सूत्रों के हवाले|अपुष्ट|कथित)\b/i;

const SENSATIONAL_RE = /[!?]{2,}|🔥|💥|BREAKING(?!\s+news)/i;

function levelFromScore(score: number): RiskLevel {
  if (score >= 0.72) return "critical";
  if (score >= 0.52) return "high";
  if (score >= 0.32) return "medium";
  return "low";
}

export function scoreFakeNewsRisk(input: {
  headline: string;
  summary: string;
  articleBody?: string;
  sourceCount: number;
  aiConfidence?: number | null;
  spamScore?: number;
  sourceOverlap?: number;
  duplicateSimilarity?: number;
}): FakeNewsRisk {
  const blob = `${input.headline} ${input.summary} ${input.articleBody ?? ""}`;
  const signals: string[] = [];
  let score = 0.08;

  if (input.sourceCount < 2) {
    signals.push("single_source");
    score += 0.22;
  }
  if (input.sourceCount === 0) {
    signals.push("no_attribution");
    score += 0.15;
  }

  if (CLICKBAIT_RE.test(blob)) {
    signals.push("clickbait_language");
    score += 0.28;
  }
  if (UNVERIFIED_RE.test(blob)) {
    signals.push("unverified_claims");
    score += 0.2;
  }
  if (SENSATIONAL_RE.test(input.headline)) {
    signals.push("sensational_headline");
    score += 0.15;
  }

  const conf = input.aiConfidence ?? 0.5;
  if (conf < 0.45) {
    signals.push("low_ai_confidence");
    score += 0.18;
  }

  if ((input.spamScore ?? 0) >= 0.4) {
    signals.push("spam_indicators");
    score += 0.25;
  }
  if ((input.sourceOverlap ?? 0) > 0.92) {
    signals.push("near_copy_of_source");
    score += 0.12;
  }
  if ((input.duplicateSimilarity ?? 0) >= 0.88) {
    signals.push("duplicate_headline_cluster");
    score += 0.1;
  }

  const wordCount = blob.split(/\s+/).filter(Boolean).length;
  if (wordCount < 40) {
    signals.push("thin_story");
    score += 0.12;
  }

  score = Math.max(0, Math.min(1, Math.round(score * 1000) / 1000));
  const level = levelFromScore(score);

  const recommendation =
    level === "critical"
      ? "Hold for senior editor review before publish"
      : level === "high"
        ? "Verify with second source and fact desk"
        : level === "medium"
          ? "Add source attribution and soften headline if needed"
          : "Standard editorial review";

  return { score, level, signals, recommendation };
}
