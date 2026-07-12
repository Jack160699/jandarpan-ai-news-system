/**
 * SEO Intelligence Engine — analysis orchestrator
 */

import { loadAnalysisSnapshot } from "@/lib/seo-intelligence/data-loader";
import { analyzeContentGaps } from "@/lib/seo-intelligence/gap-analyzer";
import { buildKeywordIntelligence } from "@/lib/seo-intelligence/keywords";
import {
  computeDistrictCoverage,
  overallCoveragePercent,
} from "@/lib/seo-intelligence/district-coverage";
import {
  analyzeHeadlines,
  averageHeadlineScore,
} from "@/lib/seo-intelligence/headline-analyzer";
import {
  averageSeoScore,
  scoreJandarpanArticles,
} from "@/lib/seo-intelligence/scorecard";
import { clusterTrendingTopics } from "@/lib/seo-intelligence/trending";
import { generateRecommendations } from "@/lib/seo-intelligence/recommendations";
import { isSeoIntelligenceEnabled } from "@/lib/seo-intelligence/config";
import { logSeoIntel, errorSeoIntel } from "@/lib/seo-intelligence/logger";
import {
  clearAnalysisOutputs,
  insertGapReports,
  insertRecommendations,
  upsertKeywordIntelligence,
  upsertTrendingTopics,
} from "@/lib/seo-intelligence/repository";
import type { SeoIntelligenceResult } from "@/lib/seo-intelligence/types";
import { isSupabaseConfigured } from "@/lib/supabase";

export async function runSeoIntelligenceEngine(
  now = new Date()
): Promise<SeoIntelligenceResult> {
  const startedAt = Date.now();

  if (!isSeoIntelligenceEnabled()) {
    return {
      ok: true,
      status: "skipped",
      durationMs: Date.now() - startedAt,
      gapsFound: 0,
      keywordsUpdated: 0,
      recommendationsGenerated: 0,
      trendingTopics: 0,
      seoHealthScore: 0,
      coveragePercent: 0,
      errors: [],
      skippedReason: "SEO_INTELLIGENCE_ENGINE_not_enabled",
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      status: "failed",
      durationMs: Date.now() - startedAt,
      gapsFound: 0,
      keywordsUpdated: 0,
      recommendationsGenerated: 0,
      trendingTopics: 0,
      seoHealthScore: 0,
      coveragePercent: 0,
      errors: ["supabase_not_configured"],
    };
  }

  logSeoIntel("analysis_started", { ts: now.toISOString() });
  const errors: string[] = [];

  try {
    const snapshot = await loadAnalysisSnapshot(now);
    const keywords = buildKeywordIntelligence(snapshot.competitorArticles, now);
    const gaps = analyzeContentGaps(
      snapshot.competitorArticles,
      snapshot.jandarpanArticles
    );
    const districtCoverage = computeDistrictCoverage(
      snapshot.competitorArticles,
      snapshot.jandarpanArticles,
      now
    );
    const jandarpanHeadlines = analyzeHeadlines(
      snapshot.jandarpanArticles.map((a) => a.headline)
    );
    const scorecards = scoreJandarpanArticles(snapshot.jandarpanArticles);
    const trendingTopics = clusterTrendingTopics(
      snapshot.competitorArticles,
      now
    );

    const recommendations = generateRecommendations({
      gaps,
      keywords,
      districtCoverage,
      jandarpanHeadlines,
      scorecards,
      trendingTopics,
    }).map((rec) => ({
      ...rec,
      metadata: {
        ...(rec.metadata ?? {}),
        analysisAt: now.toISOString(),
      },
      scores: {
        ...rec.scores,
        seo_health: averageSeoScore(scorecards),
        headline_avg: averageHeadlineScore(jandarpanHeadlines),
      },
    }));

    await clearAnalysisOutputs();
    const keywordsUpdated = await upsertKeywordIntelligence(keywords);
    const gapsFound = await insertGapReports(gaps);
    const trendingSaved = await upsertTrendingTopics(trendingTopics);
    const recommendationsGenerated = await insertRecommendations(recommendations);

    const seoHealthScore = averageSeoScore(scorecards);
    const coveragePercent = overallCoveragePercent(districtCoverage);

    logSeoIntel("keywords_updated", { count: keywordsUpdated });
    logSeoIntel("gaps_found", { count: gapsFound });
    logSeoIntel("recommendations_generated", {
      count: recommendationsGenerated,
    });
    logSeoIntel("analysis_finished", {
      durationMs: Date.now() - startedAt,
      gapsFound,
      keywordsUpdated,
      recommendationsGenerated,
      trendingTopics: trendingSaved,
      seoHealthScore,
      coveragePercent,
    });

    return {
      ok: true,
      status: "completed",
      durationMs: Date.now() - startedAt,
      gapsFound,
      keywordsUpdated,
      recommendationsGenerated,
      trendingTopics: trendingSaved,
      seoHealthScore,
      coveragePercent,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "analysis_failed";
    errors.push(message);
    errorSeoIntel("analysis_finished", { message, failed: true });
    return {
      ok: false,
      status: "failed",
      durationMs: Date.now() - startedAt,
      gapsFound: 0,
      keywordsUpdated: 0,
      recommendationsGenerated: 0,
      trendingTopics: 0,
      seoHealthScore: 0,
      coveragePercent: 0,
      errors,
    };
  }
}
