/**
 * Module 5 — SEO Scorecard (0–100 per article)
 */

import { analyzeHeadline } from "@/lib/seo-intelligence/headline-analyzer";
import { getPrimaryKeyword } from "@/lib/seo-intelligence/keywords";
import { clampScore } from "@/lib/seo-intelligence/text-utils";
import type {
  AnalysisJandarpanArticle,
  SeoScorecard,
} from "@/lib/seo-intelligence/types";

export function scoreJandarpanArticle(
  article: AnalysisJandarpanArticle
): SeoScorecard {
  const headline = article.seo_title ?? article.headline;
  const description = article.seo_description ?? article.summary ?? "";
  const headlineAnalysis = analyzeHeadline(headline);
  const primaryKeyword = getPrimaryKeyword(headline);

  const titleQuality = headlineAnalysis.seoScore;

  const descriptionQuality = clampScore(
    description.length >= 80 && description.length <= 160
      ? 95
      : description.length >= 50
        ? 70
        : description.length > 0
          ? 45
          : 20
  );

  const keywordOptimization = clampScore(
    primaryKeyword &&
      `${headline} ${description}`.toLowerCase().includes(primaryKeyword)
      ? 90
      : 50
  );

  const readability = clampScore(
    article.word_count == null
      ? 60
      : article.word_count >= 180 && article.word_count <= 900
        ? 92
        : article.word_count >= 120
          ? 75
          : 55
  );

  const schemaCompleteness = clampScore(
    Object.keys(article.editorial_metadata ?? {}).length > 0 ? 80 : 45
  );

  const internalLinking = clampScore(
    Array.isArray(article.editorial_metadata?.related_slugs)
      ? 85
      : (article.tags?.length ?? 0) >= 2
        ? 65
        : 40
  );

  const imageOptimization = clampScore(article.hero_image_url ? 90 : 35);

  const seoScore = clampScore(
    titleQuality * 0.22 +
      descriptionQuality * 0.18 +
      keywordOptimization * 0.18 +
      readability * 0.14 +
      schemaCompleteness * 0.1 +
      internalLinking * 0.1 +
      imageOptimization * 0.08
  );

  return {
    articleSlug: article.slug,
    headline,
    seoScore,
    readability,
    keywordOptimization,
    titleQuality,
    descriptionQuality,
    schemaCompleteness,
    internalLinking,
    imageOptimization,
  };
}

export function scoreJandarpanArticles(
  articles: AnalysisJandarpanArticle[]
): SeoScorecard[] {
  return articles.map(scoreJandarpanArticle);
}

export function averageSeoScore(scorecards: SeoScorecard[]): number {
  if (scorecards.length === 0) return 0;
  const total = scorecards.reduce((sum, s) => sum + s.seoScore, 0);
  return Math.round(total / scorecards.length);
}
