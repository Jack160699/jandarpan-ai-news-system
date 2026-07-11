/**
 * Module 4 — Headline Analyzer
 */

import { getPrimaryKeyword } from "@/lib/seo-intelligence/keywords";
import {
  clampScore,
  detectDistrictInText,
  hasBreakingPrefix,
  hasPowerWords,
  keywordPosition,
} from "@/lib/seo-intelligence/text-utils";
import type { HeadlineAnalysis } from "@/lib/seo-intelligence/types";

const OPTIMAL_MIN = 40;
const OPTIMAL_MAX = 90;

export function analyzeHeadline(headline: string): HeadlineAnalysis {
  const length = [...headline].length;
  const primaryKeyword = getPrimaryKeyword(headline);
  const districtSlug = detectDistrictInText(headline);
  const districtLabel = districtSlug ?? null;

  const lengthScore =
    length >= OPTIMAL_MIN && length <= OPTIMAL_MAX
      ? 100
      : length < OPTIMAL_MIN
        ? 60 + length
        : Math.max(40, 100 - (length - OPTIMAL_MAX));

  const keywordPos = primaryKeyword
    ? keywordPosition(headline, primaryKeyword)
    : null;
  const keywordScore =
    keywordPos == null ? 40 : keywordPos <= 20 ? 100 : keywordPos <= 40 ? 80 : 55;

  const districtPos = districtLabel
    ? keywordPosition(headline, districtLabel)
    : null;
  const districtScore =
    districtPos == null ? 50 : districtPos <= 25 ? 95 : districtPos <= 45 ? 75 : 60;

  const hasNumber = /\d/.test(headline);
  const powerWordCount = hasPowerWords(headline);
  const isQuestion = /[?؟]/.test(headline);
  const hasBreaking = hasBreakingPrefix(headline);

  const headlineScore = clampScore(
    lengthScore * 0.25 +
      keywordScore * 0.25 +
      districtScore * 0.15 +
      (hasNumber ? 8 : 0) +
      powerWordCount * 6 +
      (isQuestion ? 5 : 0) +
      (hasBreaking ? 10 : 0)
  );

  const ctrPrediction = clampScore(
    headlineScore * 0.7 +
      (hasBreaking ? 15 : 0) +
      (isQuestion ? 8 : 0) +
      powerWordCount * 4
  );

  const seoScore = clampScore(
    headlineScore * 0.6 + keywordScore * 0.25 + districtScore * 0.15
  );

  return {
    headline,
    length,
    keywordPosition: keywordPos,
    districtPosition: districtPos,
    hasNumber,
    powerWordCount,
    isQuestion,
    hasBreakingPrefix: hasBreaking,
    headlineScore,
    ctrPrediction,
    seoScore,
  };
}

export function analyzeHeadlines(headlines: string[]): HeadlineAnalysis[] {
  return headlines.map(analyzeHeadline);
}

export function averageHeadlineScore(analyses: HeadlineAnalysis[]): number {
  if (analyses.length === 0) return 0;
  const total = analyses.reduce((sum, a) => sum + a.headlineScore, 0);
  return Math.round(total / analyses.length);
}
