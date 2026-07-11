/**
 * Module 1 — Content Gap Analyzer
 */

import {
  GAP_DUPLICATE_TOPIC_THRESHOLD,
  GAP_MISSING_STORY_THRESHOLD,
} from "@/lib/seo-intelligence/config";
import { getPrimaryKeyword } from "@/lib/seo-intelligence/keywords";
import {
  detectDistrictInText,
  jaccardSimilarity,
  tokenize,
} from "@/lib/seo-intelligence/text-utils";
import type {
  AnalysisCompetitorArticle,
  AnalysisJandarpanArticle,
  GapReportRecord,
  SeoPriority,
} from "@/lib/seo-intelligence/types";

function scoreToPriority(score: number): SeoPriority {
  if (score >= 75) return "high";
  if (score >= 45) return "medium";
  return "low";
}

function bestJandarpanMatch(
  competitor: AnalysisCompetitorArticle,
  jandarpan: AnalysisJandarpanArticle[]
): { article: AnalysisJandarpanArticle | null; similarity: number } {
  let best: AnalysisJandarpanArticle | null = null;
  let bestScore = 0;

  const competitorText = `${competitor.title} ${competitor.description ?? ""}`;
  for (const article of jandarpan) {
    const text = `${article.headline} ${article.summary ?? ""}`;
    const score = jaccardSimilarity(competitorText, text);
    if (score > bestScore) {
      bestScore = score;
      best = article;
    }
  }

  return { article: best, similarity: bestScore };
}

function jandarpanHasKeyword(
  keyword: string,
  jandarpan: AnalysisJandarpanArticle[]
): boolean {
  const lower = keyword.toLowerCase();
  return jandarpan.some((a) =>
    `${a.headline} ${a.summary ?? ""}`.toLowerCase().includes(lower)
  );
}

export function analyzeContentGaps(
  competitorArticles: AnalysisCompetitorArticle[],
  jandarpanArticles: AnalysisJandarpanArticle[]
): GapReportRecord[] {
  const gaps: GapReportRecord[] = [];
  const jandarpanDistricts = new Set(
    jandarpanArticles.map((a) => a.district).filter(Boolean) as string[]
  );
  const jandarpanCategories = new Set(
    jandarpanArticles.map((a) => a.category).filter(Boolean) as string[]
  );

  for (const competitor of competitorArticles) {
    const { article: match, similarity } = bestJandarpanMatch(
      competitor,
      jandarpanArticles
    );
    const district =
      competitor.district ??
      detectDistrictInText(`${competitor.title} ${competitor.description ?? ""}`);
    const category = competitor.category;
    const primaryKeyword = getPrimaryKeyword(competitor.title);

    if (similarity < GAP_MISSING_STORY_THRESHOLD) {
      const gapScore = clampGapScore(85 - similarity * 100);
      gaps.push({
        competitor_article_id: competitor.id,
        generated_article_id: null,
        generated_article_slug: null,
        gap_type: "missing_story",
        gap_score: gapScore,
        priority: scoreToPriority(gapScore),
        reason: `Competitor covered "${competitor.title}" with no matching Jandarpan story.`,
        district,
        category,
        keyword: primaryKeyword,
        metadata: { similarity, competitorUrl: competitor.url },
      });
    } else if (similarity >= GAP_DUPLICATE_TOPIC_THRESHOLD) {
      const gapScore = clampGapScore(similarity * 100);
      gaps.push({
        competitor_article_id: competitor.id,
        generated_article_id: match?.id ?? null,
        generated_article_slug: match?.slug ?? null,
        gap_type: "duplicate_topic",
        gap_score: gapScore,
        priority: "low",
        reason: `Topic already covered by Jandarpan: "${match?.headline ?? "similar story"}".`,
        district,
        category,
        keyword: primaryKeyword,
        metadata: { similarity },
      });
    } else {
      const gapScore = clampGapScore(55 + similarity * 40);
      gaps.push({
        competitor_article_id: competitor.id,
        generated_article_id: match?.id ?? null,
        generated_article_slug: match?.slug ?? null,
        gap_type: "similar_story",
        gap_score: gapScore,
        priority: scoreToPriority(gapScore),
        reason: `Similar angle exists but competitor framing differs — consider updating Jandarpan coverage.`,
        district,
        category,
        keyword: primaryKeyword,
        metadata: { similarity },
      });
    }

    if (district && !jandarpanDistricts.has(district)) {
      gaps.push({
        competitor_article_id: competitor.id,
        generated_article_id: null,
        generated_article_slug: null,
        gap_type: "missing_district",
        gap_score: 70,
        priority: "high",
        reason: `No Jandarpan coverage detected for district "${district}".`,
        district,
        category,
        keyword: primaryKeyword,
      });
    }

    if (category && !jandarpanCategories.has(category)) {
      gaps.push({
        competitor_article_id: competitor.id,
        generated_article_id: null,
        generated_article_slug: null,
        gap_type: "missing_category",
        gap_score: 55,
        priority: "medium",
        reason: `Category "${category}" is active for competitors but absent in Jandarpan window.`,
        district,
        category,
        keyword: primaryKeyword,
      });
    }

    if (primaryKeyword && !jandarpanHasKeyword(primaryKeyword, jandarpanArticles)) {
      gaps.push({
        competitor_article_id: competitor.id,
        generated_article_id: null,
        generated_article_slug: null,
        gap_type: "missing_keyword",
        gap_score: 60,
        priority: "medium",
        reason: `Keyword "${primaryKeyword}" appears in competitor headlines but not Jandarpan titles.`,
        district,
        category,
        keyword: primaryKeyword,
      });
    }

    if (
      (competitor.headings?.length ?? 0) >= 3 &&
      (match?.summary?.length ?? 0) < 120
    ) {
      gaps.push({
        competitor_article_id: competitor.id,
        generated_article_id: match?.id ?? null,
        generated_article_slug: match?.slug ?? null,
        gap_type: "missing_faq",
        gap_score: 50,
        priority: "medium",
        reason: "Competitor article structure suggests FAQ/schema opportunity for Jandarpan.",
        district,
        category,
        keyword: primaryKeyword,
        metadata: { headingCount: competitor.headings.length },
      });
    }
  }

  return gaps.sort((a, b) => b.gap_score - a.gap_score);
}

function clampGapScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function countMissingStories(gaps: GapReportRecord[]): number {
  return gaps.filter((g) => g.gap_type === "missing_story").length;
}

export function topGapKeywords(gaps: GapReportRecord[], limit = 10): string[] {
  const freq = new Map<string, number>();
  for (const gap of gaps) {
    for (const token of tokenize(gap.reason)) {
      freq.set(token, (freq.get(token) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k]) => k);
}
