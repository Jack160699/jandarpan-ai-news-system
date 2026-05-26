import type {
  AdminInsight,
  EnterpriseAnalyticsReport,
} from "@/lib/analytics/types";

export function buildAdminInsights(
  report: EnterpriseAnalyticsReport
): AdminInsight[] {
  const insights: AdminInsight[] = [];
  let id = 0;
  const next = () => `insight-${++id}`;

  const { summary, liveReaders, productivity, ctrAnalytics } = report;

  if (liveReaders.activeReaders >= 10) {
    insights.push({
      id: next(),
      severity: "success",
      title: "Strong live readership",
      detail: `${liveReaders.activeReaders} active readers in the last 5 minutes.`,
    });
  } else if (summary.totalViews === 0) {
    insights.push({
      id: next(),
      severity: "warning",
      title: "No reader events in window",
      detail: "Enable ReaderAnalyticsTracker on story pages to collect metrics.",
    });
  }

  if (summary.overallCtr < 0.03 && summary.totalViews > 50) {
    insights.push({
      id: next(),
      severity: "warning",
      title: "Low CTR across desk",
      detail: `Overall CTR ${(summary.overallCtr * 100).toFixed(1)}% — review headlines and hero placement.`,
    });
  }

  if (summary.avgScrollDepth < 35 && summary.totalViews > 20) {
    insights.push({
      id: next(),
      severity: "warning",
      title: "Shallow scroll depth",
      detail: `Average ${summary.avgScrollDepth}% — consider shorter ledes and visual breaks.`,
    });
  }

  if (productivity.articlesPublished > 0 && productivity.avgTimeToPublishHours != null) {
    if (productivity.avgTimeToPublishHours > 48) {
      insights.push({
        id: next(),
        severity: "info",
        title: "Publishing cycle slow",
        detail: `Avg ${Math.round(productivity.avgTimeToPublishHours)}h draft-to-publish — check workflow SLAs.`,
      });
    }
  }

  const topDistrict = report.districtEngagement[0];
  if (topDistrict && topDistrict.views > summary.totalViews * 0.4) {
    insights.push({
      id: next(),
      severity: "info",
      title: "District concentration",
      detail: `${topDistrict.district} drives ${Math.round((topDistrict.views / Math.max(summary.totalViews, 1)) * 100)}% of views.`,
    });
  }

  const topRanked = report.rankedArticles[0];
  if (topRanked) {
    insights.push({
      id: next(),
      severity: "success",
      title: "Top ranked story",
      detail: `"${topRanked.headline.slice(0, 60)}" — score ${topRanked.rankScore}.`,
    });
  }

  const seoGap = report.seoRankings.filter((s) => s.seoScore < 0.5).length;
  if (seoGap > 3) {
    insights.push({
      id: next(),
      severity: "warning",
      title: "SEO gaps detected",
      detail: `${seoGap} articles below 50% SEO score — run desk SEO pass.`,
    });
  }

  if (ctrAnalytics.bySurface.length > 1) {
    const best = [...ctrAnalytics.bySurface].sort((a, b) => b.ctr - a.ctr)[0];
    insights.push({
      id: next(),
      severity: "info",
      title: "Best performing surface",
      detail: `${best.surface} CTR ${(best.ctr * 100).toFixed(1)}% (${best.views} views).`,
    });
  }

  return insights.slice(0, 10);
}
