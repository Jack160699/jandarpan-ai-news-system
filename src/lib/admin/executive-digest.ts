/**
 * Executive Intelligence Digest — read-only projection of IntelligenceCenterVm.
 * Pure presentation mapping; no aggregation, no I/O.
 */

import type { IntelligenceCenterVm } from "@/lib/admin/intelligence-center";
import type { CoverageInsightRankedItem } from "@/lib/newsroom-health/build-coverage-insights";
import type { CoverageOpportunityItem } from "@/lib/newsroom-health/build-coverage-opportunities";

const DIGEST_LIMIT = 5;

export type ExecutiveDigestKpi = {
  label: string;
  value: string;
  detail: string | null;
};

export type ExecutiveDigestWorkflowSummary = {
  total: number;
  pendingReview: number;
  overdue: number;
  publishedToday: number;
  byStage: CoverageInsightRankedItem[];
};

export type ExecutiveDigestLaunchItem = {
  label: string;
  status: string;
  detail: string;
};

export type ExecutiveDigestRecommendation = {
  id: string;
  title: string;
  severity: string;
  action: string;
  route: string;
};

export type ExecutiveDigestVm = {
  generatedAt: string;
  title: string;
  executiveSummary: {
    overallStatus: string;
    overallLabel: string;
    sampleSize: number;
    opportunityCount: number;
    highPriorityCount: number;
    queueHealth: string | null;
  };
  newsroomHealth: {
    overallStatus: string;
    overallLabel: string;
    indicators: ExecutiveDigestKpi[];
  };
  topKpis: ExecutiveDigestKpi[];
  topCoverageInsights: ExecutiveDigestKpi[];
  topOpportunities: CoverageOpportunityItem[];
  workflowSummary: ExecutiveDigestWorkflowSummary;
  launchSummary: ExecutiveDigestLaunchItem[];
  topActiveEvents: CoverageInsightRankedItem[];
  topDistricts: CoverageInsightRankedItem[];
  topCategories: CoverageInsightRankedItem[];
  recommendations: ExecutiveDigestRecommendation[];
  plainText: string;
  hasLayer: boolean;
};

function sliceRanked(
  items: CoverageInsightRankedItem[],
  limit = DIGEST_LIMIT
): CoverageInsightRankedItem[] {
  return items.slice(0, limit);
}

function mapHealthIndicators(
  center: IntelligenceCenterVm
): ExecutiveDigestKpi[] {
  return center.health.indicators.slice(0, DIGEST_LIMIT).map((indicator) => ({
    label: indicator.label,
    value: indicator.value,
    detail: indicator.detail,
  }));
}

function mapLaunchSummary(center: IntelligenceCenterVm): ExecutiveDigestLaunchItem[] {
  return center.launch.widgets.slice(0, DIGEST_LIMIT).map((widget) => ({
    label: widget.label,
    status: widget.status,
    detail: widget.detail,
  }));
}

function mapRecommendations(
  opportunities: CoverageOpportunityItem[]
): ExecutiveDigestRecommendation[] {
  return opportunities.slice(0, DIGEST_LIMIT).map((item) => ({
    id: item.id,
    title: item.title,
    severity: item.severity,
    action: item.recommendedAction,
    route: item.route,
  }));
}

function formatRankedList(
  title: string,
  items: CoverageInsightRankedItem[]
): string {
  if (!items.length) return "";
  const lines = items.map((item, index) => `${index + 1}. ${item.label} — ${item.count}`);
  return `${title}\n${lines.join("\n")}`;
}

function formatKpiList(title: string, items: ExecutiveDigestKpi[]): string {
  if (!items.length) return "";
  const lines = items.map(
    (item) =>
      `- ${item.label}: ${item.value}${item.detail ? ` (${item.detail})` : ""}`
  );
  return `${title}\n${lines.join("\n")}`;
}

function buildPlainText(center: IntelligenceCenterVm, digest: Omit<ExecutiveDigestVm, "plainText" | "hasLayer">): string {
  const sections = [
    digest.title,
    `Generated: ${digest.generatedAt}`,
    "",
    "EXECUTIVE SUMMARY",
    `Overall status: ${digest.executiveSummary.overallLabel} (${digest.executiveSummary.overallStatus})`,
    `Articles in snapshot: ${digest.executiveSummary.sampleSize}`,
    `Opportunities: ${digest.executiveSummary.opportunityCount} (${digest.executiveSummary.highPriorityCount} high priority)`,
    digest.executiveSummary.queueHealth
      ? `Queue health: ${digest.executiveSummary.queueHealth}`
      : null,
    "",
    "NEWSROOM HEALTH",
    `Status: ${digest.newsroomHealth.overallLabel} (${digest.newsroomHealth.overallStatus})`,
    formatKpiList("Indicators", digest.newsroomHealth.indicators),
    "",
    formatKpiList("Top KPIs", digest.topKpis),
    "",
    formatKpiList("Top coverage insights", digest.topCoverageInsights),
    "",
    "TOP OPPORTUNITIES",
    digest.topOpportunities.length
      ? digest.topOpportunities
          .map(
            (item, index) =>
              `${index + 1}. [${item.severity}] ${item.title}\n   ${item.reason}\n   Recommended: ${item.recommendedAction}\n   Route: ${item.route}`
          )
          .join("\n\n")
      : "No opportunities in snapshot.",
    "",
    "WORKFLOW SUMMARY",
    `Total: ${digest.workflowSummary.total}`,
    `Pending review: ${digest.workflowSummary.pendingReview}`,
    `Overdue: ${digest.workflowSummary.overdue}`,
    `Published today: ${digest.workflowSummary.publishedToday}`,
    formatRankedList("By stage", digest.workflowSummary.byStage),
    "",
    "LAUNCH SUMMARY",
    digest.launchSummary.length
      ? digest.launchSummary
          .map((item) => `- ${item.label}: ${item.status} — ${item.detail}`)
          .join("\n")
      : "No launch widgets in snapshot.",
    "",
    formatRankedList("Top active events", digest.topActiveEvents),
    "",
    formatRankedList("Top districts", digest.topDistricts),
    "",
    formatRankedList("Top categories", digest.topCategories),
    "",
    "KEY RECOMMENDATIONS",
    digest.recommendations.length
      ? digest.recommendations
          .map(
            (item, index) =>
              `${index + 1}. [${item.severity}] ${item.title}\n   ${item.action}\n   Route: ${item.route}`
          )
          .join("\n\n")
      : "No recommendations from opportunity metadata.",
  ];

  return sections.filter((section) => section != null).join("\n");
}

export function buildExecutiveDigest(center: IntelligenceCenterVm): ExecutiveDigestVm {
  const topCoverageInsights = center.coverage.kpis.slice(0, DIGEST_LIMIT).map((kpi) => ({
    label: kpi.label,
    value: kpi.value,
    detail: kpi.detail,
  }));

  const topKpis = topCoverageInsights;
  const topOpportunities = center.opportunities.opportunities.slice(0, DIGEST_LIMIT);
  const recommendations = mapRecommendations(center.opportunities.opportunities);

  const digestBody: Omit<ExecutiveDigestVm, "plainText" | "hasLayer"> = {
    generatedAt: center.fetchedAt,
    title: "Jandarpan.news Executive Intelligence Digest",
    executiveSummary: {
      overallStatus: center.summary.overallStatus,
      overallLabel: center.summary.overallLabel,
      sampleSize: center.summary.sampleSize,
      opportunityCount: center.summary.opportunityCount,
      highPriorityCount: center.summary.highPriorityCount,
      queueHealth: center.health.queueHealth,
    },
    newsroomHealth: {
      overallStatus: center.health.overallStatus,
      overallLabel: center.health.overallLabel,
      indicators: mapHealthIndicators(center),
    },
    topKpis,
    topCoverageInsights,
    workflowSummary: {
      total: center.workflow.total,
      pendingReview: center.workflow.pendingReview,
      overdue: center.workflow.overdue,
      publishedToday: center.workflow.publishedToday,
      byStage: sliceRanked(center.workflow.byStage),
    },
    launchSummary: mapLaunchSummary(center),
    topOpportunities,
    topActiveEvents: sliceRanked(center.highlights.activeEvents),
    topDistricts: sliceRanked(center.highlights.topDistricts),
    topCategories: sliceRanked(center.highlights.topCategories),
    recommendations,
  };

  const vm: ExecutiveDigestVm = {
    ...digestBody,
    plainText: buildPlainText(center, digestBody),
    hasLayer: false,
  };

  vm.hasLayer = Boolean(
    center.hasLayer &&
      (vm.topKpis.length ||
        vm.topOpportunities.length ||
        vm.newsroomHealth.indicators.length ||
        vm.launchSummary.length)
  );

  return vm;
}
