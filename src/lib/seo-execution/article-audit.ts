/**
 * Module 1 — Article SEO Audit
 */

import { analyzeHeadline } from "@/lib/seo-intelligence/headline-analyzer";
import { scoreJandarpanArticle } from "@/lib/seo-intelligence/scorecard";
import { getPrimaryKeyword } from "@/lib/seo-intelligence/keywords";
import { clampScore, detectDistrictInText } from "@/lib/seo-intelligence/text-utils";
import type {
  AnalysisJandarpanArticle,
} from "@/lib/seo-intelligence/types";
import type {
  ArticleAuditScores,
  ExecutionArticle,
  IntelligenceContext,
} from "@/lib/seo-execution/types";

function toAnalysisArticle(article: ExecutionArticle): AnalysisJandarpanArticle {
  return {
    id: article.id,
    slug: article.slug,
    headline: article.headline,
    summary: article.summary,
    seo_title: article.seo_title,
    seo_description: article.seo_description,
    tags: article.tags,
    published_at: article.published_at,
    district: article.district,
    category: article.category,
    word_count: article.word_count,
    hero_image_url: article.hero_image_url,
    editorial_metadata: article.editorial_metadata,
  };
}

function countEntities(text: string): number {
  const districts = detectDistrictInText(text);
  const keywords = getPrimaryKeyword(text);
  let count = 0;
  if (districts) count += 1;
  if (keywords) count += 1;
  const orgMatches = text.match(/मंत्री|सरकार|विभाग|मुख्यमंत्री|minister|government/gi);
  count += orgMatches?.length ?? 0;
  return Math.min(count, 10);
}

export function auditArticle(
  article: ExecutionArticle,
  context: IntelligenceContext
): ArticleAuditScores {
  const analysis = toAnalysisArticle(article);
  const scorecard = scoreJandarpanArticle(analysis);
  const headline = article.seo_title ?? article.headline;
  const headlineAnalysis = analyzeHeadline(headline);
  const fullText = `${headline} ${article.summary ?? ""} ${article.article_body ?? ""}`;

  const entityCoverage = clampScore(countEntities(fullText) * 18);
  const keywordCoverage = scorecard.keywordOptimization;

  const googleNewsScore = clampScore(
    (article.published_at ? 30 : 0) +
      (headlineAnalysis.hasBreakingPrefix ? 20 : 0) +
      (article.word_count >= 200 ? 25 : 10) +
      (article.hero_image_url ? 15 : 0) +
      (article.district ? 10 : 0)
  );

  const explanations: Record<string, string> = {
    seoScore: `Composite SEO health: ${scorecard.seoScore}/100 based on title, meta, keywords, and structure.`,
    headlineScore: `Headline length ${headlineAnalysis.length} chars; keyword placement score ${headlineAnalysis.seoScore}.`,
    ctrScore: `Predicted CTR potential ${headlineAnalysis.ctrPrediction}/100 — power words and breaking prefix boost clicks.`,
    googleNewsScore: `Google News readiness ${googleNewsScore}/100 — freshness, image, district tag, and word count.`,
    readability: `Readability ${scorecard.readability}/100 for ${article.word_count} words.`,
    entityCoverage: `Entity coverage ${entityCoverage}/100 — districts, organizations, and named entities detected.`,
    keywordCoverage: `Keyword coverage ${keywordCoverage}/100 — primary keyword "${getPrimaryKeyword(headline) ?? "none"}".`,
    internalLinkingScore: `Internal linking ${scorecard.internalLinking}/100 — related story suggestions available.`,
    schemaScore: `Schema completeness ${scorecard.schemaCompleteness}/100.`,
    imageScore: `Image SEO ${scorecard.imageOptimization}/100.`,
  };

  if (context.gscQueries.length > 0) {
    const top = context.gscQueries[0];
    explanations.keywordCoverage += ` GSC top query: "${top.query}" (${top.clicks} clicks, pos ${top.position}).`;
  }
  if (context.seoGaps.length > 0) {
    explanations.seoScore += ` ${context.seoGaps.length} competitor gap signals detected.`;
  }

  const overallScore = clampScore(
    scorecard.seoScore * 0.2 +
      headlineAnalysis.headlineScore * 0.15 +
      headlineAnalysis.ctrPrediction * 0.1 +
      googleNewsScore * 0.1 +
      scorecard.readability * 0.1 +
      entityCoverage * 0.08 +
      keywordCoverage * 0.08 +
      scorecard.internalLinking * 0.07 +
      scorecard.schemaCompleteness * 0.06 +
      scorecard.imageOptimization * 0.06
  );

  return {
    seoScore: scorecard.seoScore,
    headlineScore: headlineAnalysis.headlineScore,
    ctrScore: headlineAnalysis.ctrPrediction,
    googleNewsScore,
    readability: scorecard.readability,
    entityCoverage,
    keywordCoverage,
    internalLinkingScore: scorecard.internalLinking,
    schemaScore: scorecard.schemaCompleteness,
    imageScore: scorecard.imageOptimization,
    overallScore,
    explanations,
  };
}
