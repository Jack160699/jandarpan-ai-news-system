/**
 * Module 3 — District Coverage Intelligence
 */

import { CG_DISTRICTS, getDistrict } from "@/lib/regional/districts";
import { isToday } from "@/lib/seo-intelligence/text-utils";
import type {
  AnalysisCompetitorArticle,
  AnalysisJandarpanArticle,
  DistrictCoverageRecord,
} from "@/lib/seo-intelligence/types";

export function computeDistrictCoverage(
  competitorArticles: AnalysisCompetitorArticle[],
  jandarpanArticles: AnalysisJandarpanArticle[],
  now = new Date()
): DistrictCoverageRecord[] {
  return CG_DISTRICTS.map((district) => {
    const competitorToday = competitorArticles.filter(
      (a) => a.district === district.slug && isToday(a.published_at ?? a.fetched_at, now)
    ).length;
    const jandarpanToday = jandarpanArticles.filter(
      (a) => a.district === district.slug && isToday(a.published_at, now)
    ).length;

    const missingStories = Math.max(0, competitorToday - jandarpanToday);
    const coveragePercent =
      competitorToday === 0
        ? jandarpanToday > 0
          ? 100
          : 0
        : Math.min(100, Math.round((jandarpanToday / competitorToday) * 100));

    const trendScore = clampTrend(
      jandarpanToday * 12 + coveragePercent * 0.5 - missingStories * 8
    );

    let recommendation = "Coverage balanced.";
    if (missingStories >= 2) {
      recommendation = `Publish ${missingStories} more stories for ${district.name} today.`;
    } else if (coveragePercent < 40 && competitorToday > 0) {
      recommendation = `Competitors are outpacing Jandarpan in ${district.name}.`;
    } else if (jandarpanToday > competitorToday) {
      recommendation = `Jandarpan leads ${district.name} coverage today.`;
    }

    return {
      district: district.slug,
      districtName: district.name,
      competitorArticlesToday: competitorToday,
      jandarpanArticlesToday: jandarpanToday,
      coveragePercent,
      missingStories,
      trendScore,
      recommendation,
    };
  }).sort((a, b) => a.coveragePercent - b.coveragePercent);
}

export function overallCoveragePercent(
  records: DistrictCoverageRecord[]
): number {
  if (records.length === 0) return 0;
  const total = records.reduce((sum, r) => sum + r.coveragePercent, 0);
  return Math.round(total / records.length);
}

export function underCoveredDistricts(
  records: DistrictCoverageRecord[],
  threshold = 50
): DistrictCoverageRecord[] {
  return records.filter((r) => r.coveragePercent < threshold);
}

function clampTrend(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function resolveDistrictName(slug: string): string {
  return getDistrict(slug)?.name ?? slug;
}
