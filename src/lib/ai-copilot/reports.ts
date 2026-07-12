/**
 * Module 8 — Executive Reports
 */

import { buildExecutiveDashboard } from "@/lib/ai-copilot/aggregator";
import { listRecommendations } from "@/lib/ai-copilot/repository";
import type { GeneratedReport } from "@/lib/ai-copilot/types";

export async function generateDailyBriefing(): Promise<GeneratedReport> {
  const executive = await buildExecutiveDashboard();
  const queue = await listRecommendations(10);

  return {
    report_type: "daily_briefing",
    title: `Daily Editorial Briefing — ${new Date().toISOString().slice(0, 10)}`,
    summary: `SEO health ${executive.overallSeoHealth}/100 · ${executive.pendingSeoRecommendations} open recommendations · ${executive.competitorActivity.articlesLast24h} competitor articles today.`,
    content: {
      executive,
      topOpportunities: queue.slice(0, 5),
      biggestRisks: queue.filter((r) => r.priority === "high").slice(0, 3),
      breakingTopics: executive.breakingTopics,
    },
  };
}

export async function generateWeeklySeoReport(): Promise<GeneratedReport> {
  const executive = await buildExecutiveDashboard();
  const queue = await listRecommendations(20);

  return {
    report_type: "weekly_seo",
    title: `Weekly SEO Report — Week of ${new Date().toISOString().slice(0, 10)}`,
    summary: `Traffic: ${executive.trafficTrend.clicks} clicks (${executive.trafficTrend.clicksDelta >= 0 ? "+" : ""}${executive.trafficTrend.clicksDelta} 7d). SERP visibility ${executive.serpVisibility}.`,
    content: {
      traffic: executive.trafficTrend,
      searchConsole: executive.searchConsoleSummary,
      serpVisibility: executive.serpVisibility,
      districtCoverage: executive.districtCoverage,
      recommendations: queue,
    },
  };
}

export async function generateOpportunitiesReport(): Promise<GeneratedReport> {
  const queue = await listRecommendations(30);
  const high = queue.filter((r) => r.priority === "high");

  return {
    report_type: "opportunities",
    title: "Top Opportunities Report",
    summary: `${high.length} high-priority opportunities identified across all intelligence sources.`,
    content: { opportunities: queue, highPriority: high },
  };
}

export async function generateRisksReport(): Promise<GeneratedReport> {
  const executive = await buildExecutiveDashboard();
  const queue = await listRecommendations(30);
  const risks = queue.filter(
    (r) =>
      r.priority === "high" &&
      (r.source === "competitor_intelligence" || r.source === "search_console")
  );

  return {
    report_type: "risks",
    title: "Biggest Risks Report",
    summary: `${risks.length} high-priority risks. CTR ${executive.searchConsoleSummary.ctr}% · Competitor activity elevated: ${executive.competitorActivity.articlesLast24h > 15}.`,
    content: { risks, executive },
  };
}

export async function generateAllReports(): Promise<GeneratedReport[]> {
  return Promise.all([
    generateDailyBriefing(),
    generateWeeklySeoReport(),
    generateOpportunitiesReport(),
    generateRisksReport(),
  ]);
}
