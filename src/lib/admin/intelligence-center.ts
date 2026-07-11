/**
 * Intelligence Center — executive composition of existing newsroom VMs.
 * Pure composition; no duplicate aggregation, no I/O.
 */

import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";
import type { WorkflowBoardSnapshot } from "@/lib/editorial-workflow/types";
import type { LaunchHealthWidget } from "@/lib/ops/launch-health";
import {
  buildCoverageInsights,
  type CoverageInsightRankedItem,
  type CoverageInsightsVm,
} from "@/lib/newsroom-health/build-coverage-insights";
import {
  buildCoverageOpportunities,
  type CoverageOpportunityItem,
  type CoverageOpportunityVm,
} from "@/lib/newsroom-health/build-coverage-opportunities";
import {
  buildNewsroomHealth,
  type NewsroomHealthStatus,
  type NewsroomHealthVm,
} from "@/lib/newsroom-health/build-health";

export type IntelligenceCenterWorkflowSummary = {
  total: number;
  pendingReview: number;
  overdue: number;
  publishedToday: number;
  byStage: CoverageInsightRankedItem[];
  hasLayer: boolean;
};

export type IntelligenceCenterLaunchSummary = {
  widgets: LaunchHealthWidget[];
  hasLayer: boolean;
};

export type IntelligenceCenterSummary = {
  overallStatus: NewsroomHealthStatus;
  overallLabel: string;
  sampleSize: number;
  opportunityCount: number;
  highPriorityCount: number;
};

export type IntelligenceCenterHighlights = {
  topCategories: CoverageInsightRankedItem[];
  topDistricts: CoverageInsightRankedItem[];
  activeEvents: CoverageInsightRankedItem[];
  topEntities: CoverageInsightRankedItem[];
  highPriorityOpportunities: CoverageOpportunityItem[];
};

export type IntelligenceCenterVm = {
  fetchedAt: string;
  summary: IntelligenceCenterSummary;
  health: NewsroomHealthVm;
  coverage: CoverageInsightsVm;
  opportunities: CoverageOpportunityVm;
  workflow: IntelligenceCenterWorkflowSummary;
  launch: IntelligenceCenterLaunchSummary;
  highlights: IntelligenceCenterHighlights;
  hasLayer: boolean;
};

export type BuildIntelligenceCenterInput = {
  editorial: EditorialDashboardSnapshot | null;
  workflowAnalytics?: WorkflowBoardSnapshot["analytics"] | null;
  launchWidgets?: LaunchHealthWidget[] | null;
};

function resolvePendingReview(
  editorial: EditorialDashboardSnapshot,
  workflowAnalytics?: WorkflowBoardSnapshot["analytics"] | null
): number {
  if (workflowAnalytics?.pending_review != null) {
    return workflowAnalytics.pending_review;
  }
  return editorial.counts.pending;
}

export function buildIntelligenceCenter(
  input: BuildIntelligenceCenterInput
): IntelligenceCenterVm {
  const { editorial, workflowAnalytics, launchWidgets } = input;

  const health = buildNewsroomHealth({
    editorial,
    workflowAnalytics,
    launchWidgets,
  });
  const coverage = buildCoverageInsights({
    editorial,
    workflowAnalytics,
  });
  const opportunities = buildCoverageOpportunities({
    editorial,
    workflowAnalytics,
  });

  const highPriorityOpportunities = opportunities.opportunities.filter(
    (item) => item.severity === "high"
  );

  const workflow: IntelligenceCenterWorkflowSummary = {
    total:
      workflowAnalytics?.total ?? editorial?.generatedArticles.length ?? 0,
    pendingReview: editorial
      ? resolvePendingReview(editorial, workflowAnalytics)
      : 0,
    overdue: workflowAnalytics?.overdue ?? 0,
    publishedToday:
      workflowAnalytics?.published_today ??
      editorial?.counts.publishedToday ??
      0,
    byStage: coverage.workflowStages,
    hasLayer: Boolean(
      workflowAnalytics ||
        coverage.workflowStages.length ||
        (editorial?.generatedArticles.length ?? 0) > 0
    ),
  };

  const launchWidgetsList = launchWidgets ?? [];
  const launch: IntelligenceCenterLaunchSummary = {
    widgets: launchWidgetsList,
    hasLayer: launchWidgetsList.length > 0,
  };

  const summary: IntelligenceCenterSummary = {
    overallStatus: health.overallStatus,
    overallLabel: health.overallLabel,
    sampleSize: coverage.sampleSize,
    opportunityCount: opportunities.opportunityCount,
    highPriorityCount: highPriorityOpportunities.length,
  };

  const highlights: IntelligenceCenterHighlights = {
    topCategories: coverage.topCategoriesToday,
    topDistricts: coverage.topDistricts,
    activeEvents: coverage.activeEvents,
    topEntities: coverage.topEntities,
    highPriorityOpportunities,
  };

  const vm: IntelligenceCenterVm = {
    fetchedAt: editorial?.fetchedAt ?? health.fetchedAt,
    summary,
    health,
    coverage,
    opportunities,
    workflow,
    launch,
    highlights,
    hasLayer: false,
  };

  vm.hasLayer = Boolean(
    health.hasLayer ||
      coverage.hasLayer ||
      opportunities.hasLayer ||
      workflow.hasLayer ||
      launch.hasLayer
  );

  return vm;
}
