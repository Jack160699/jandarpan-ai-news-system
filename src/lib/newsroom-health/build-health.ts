/**
 * Newsroom Health Intelligence — read-only operational summary.
 * Pure aggregation from existing snapshots; no AI, no new analytics layer.
 */

import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";
import type { WorkflowBoardSnapshot } from "@/lib/editorial-workflow/types";
import type { LaunchHealthWidget } from "@/lib/ops/launch-health";

export type NewsroomHealthTone = "stable" | "warning" | "breaking" | "neutral";

export type NewsroomHealthStatus = "healthy" | "degraded" | "unhealthy";

export type NewsroomHealthIndicator = {
  id: string;
  label: string;
  value: string;
  tone: NewsroomHealthTone;
  detail: string | null;
};

export type NewsroomHealthVm = {
  fetchedAt: string;
  overallStatus: NewsroomHealthStatus;
  overallLabel: string;
  indicators: NewsroomHealthIndicator[];
  queueHealth: string | null;
  hasLayer: boolean;
};

export type BuildNewsroomHealthInput = {
  editorial: EditorialDashboardSnapshot | null;
  workflowAnalytics?: WorkflowBoardSnapshot["analytics"] | null;
  launchWidgets?: LaunchHealthWidget[] | null;
};

function toneForCount(
  value: number,
  warningAt: number,
  criticalAt: number
): NewsroomHealthTone {
  if (value >= criticalAt) return "breaking";
  if (value >= warningAt) return "warning";
  return value > 0 ? "neutral" : "stable";
}

function resolveAwaitingReview(
  editorial: EditorialDashboardSnapshot,
  workflowAnalytics?: WorkflowBoardSnapshot["analytics"] | null
): number {
  if (workflowAnalytics?.pending_review != null) {
    return workflowAnalytics.pending_review;
  }
  return editorial.counts.pending;
}

function resolveQueueHealth(
  editorial: EditorialDashboardSnapshot,
  launchWidgets?: LaunchHealthWidget[] | null
): string | null {
  const aiPending = editorial.counts.aiQueuePending;
  const imagePending = editorial.counts.imageQueuePending;
  const segments: string[] = [];

  if (aiPending > 0) {
    segments.push(`AI queue: ${aiPending} pending`);
  }
  if (imagePending > 0) {
    segments.push(`Image queue: ${imagePending} pending`);
  }

  const editorialWidget = launchWidgets?.find((widget) => widget.id === "editorial");
  const imageWidget = launchWidgets?.find((widget) => widget.id === "image");
  if (editorialWidget?.detail?.trim()) {
    segments.push(editorialWidget.detail.trim());
  } else if (imageWidget?.detail?.trim() && !segments.length) {
    segments.push(imageWidget.detail.trim());
  }

  return segments.length ? segments.join(" · ") : null;
}

function resolveOverallStatus(
  editorial: EditorialDashboardSnapshot | null,
  workflowAnalytics?: WorkflowBoardSnapshot["analytics"] | null,
  launchWidgets?: LaunchHealthWidget[] | null
): { status: NewsroomHealthStatus; label: string } {
  if (!editorial) {
    return { status: "degraded", label: "Newsroom snapshot unavailable" };
  }

  const counts = editorial.counts;
  const queueTotal = counts.aiQueuePending + counts.imageQueuePending;
  const awaitingReview = resolveAwaitingReview(editorial, workflowAnalytics);
  const overdue = workflowAnalytics?.overdue ?? 0;

  const launchUnhealthy = (launchWidgets ?? []).some(
    (widget) => widget.status === "unhealthy"
  );
  const launchDegraded = (launchWidgets ?? []).some(
    (widget) => widget.status === "degraded"
  );

  if (launchUnhealthy || queueTotal >= 300 || counts.aiQueuePending >= 300) {
    return { status: "unhealthy", label: "Newsroom under critical load" };
  }

  if (
    launchDegraded ||
    queueTotal >= 80 ||
    awaitingReview > 0 ||
    overdue > 0 ||
    counts.pending > 0
  ) {
    return { status: "degraded", label: "Newsroom attention needed" };
  }

  return { status: "healthy", label: "Newsroom operating normally" };
}

function pushIndicator(
  indicators: NewsroomHealthIndicator[],
  indicator: NewsroomHealthIndicator | null
): void {
  if (!indicator) return;
  indicators.push(indicator);
}

export function buildNewsroomHealth(
  input: BuildNewsroomHealthInput
): NewsroomHealthVm {
  const { editorial, workflowAnalytics, launchWidgets } = input;
  const fetchedAt = editorial?.fetchedAt ?? new Date().toISOString();

  const overall = resolveOverallStatus(editorial, workflowAnalytics, launchWidgets);
  const indicators: NewsroomHealthIndicator[] = [];

  if (editorial) {
    const counts = editorial.counts;
    const awaitingReview = resolveAwaitingReview(editorial, workflowAnalytics);
    const publishedToday =
      workflowAnalytics?.published_today ?? counts.publishedToday;
    const breakingStories = editorial.trending.breakingCount;

    pushIndicator(indicators, {
      id: "awaiting_review",
      label: "Awaiting review",
      value: `${awaitingReview}`,
      tone: toneForCount(awaitingReview, 1, 15),
      detail:
        workflowAnalytics?.pending_review != null
          ? "Workflow review stages"
          : "Editorial status pending",
    });

    pushIndicator(indicators, {
      id: "published_today",
      label: "Published today",
      value: `${publishedToday}`,
      tone: publishedToday > 0 ? "stable" : "neutral",
      detail: null,
    });

    if (counts.fallbackArticles > 0) {
      pushIndicator(indicators, {
        id: "fallback_articles",
        label: "Fallback generation",
        value: `${counts.fallbackArticles}`,
        tone: toneForCount(counts.fallbackArticles, 1, 8),
        detail: "Articles with used_fallback metadata",
      });
    }

    if (counts.repairedArticles > 0) {
      pushIndicator(indicators, {
        id: "repaired_articles",
        label: "Editorial repair",
        value: `${counts.repairedArticles}`,
        tone: toneForCount(counts.repairedArticles, 1, 8),
        detail: "Articles with repaired metadata",
      });
    }

    if (counts.events > 0 || counts.eventLinkedArticles > 0) {
      pushIndicator(indicators, {
        id: "active_event_coverage",
        label: "Active event coverage",
        value: `${counts.events}`,
        tone: counts.events > 0 ? "stable" : "neutral",
        detail:
          counts.eventLinkedArticles > 0
            ? `${counts.eventLinkedArticles} event-linked articles`
            : `${counts.events} tracked events`,
      });
    }

    if (breakingStories > 0) {
      pushIndicator(indicators, {
        id: "breaking_stories",
        label: "Breaking stories",
        value: `${breakingStories}`,
        tone: "warning",
        detail: "Articles marked breaking in editorial metadata",
      });
    }

    const queueHealth = resolveQueueHealth(editorial, launchWidgets);
    if (queueHealth) {
      const queueTotal = counts.aiQueuePending + counts.imageQueuePending;
      pushIndicator(indicators, {
        id: "queue_health",
        label: "Queue health",
        value: `${queueTotal}`,
        tone: toneForCount(queueTotal, 50, 200),
        detail: queueHealth,
      });
    }
  }

  pushIndicator(indicators, {
    id: "overall_status",
    label: "Overall newsroom status",
    value: overall.label,
    tone:
      overall.status === "healthy"
        ? "stable"
        : overall.status === "degraded"
          ? "warning"
          : "breaking",
    detail: null,
  });

  const queueHealth = editorial
    ? resolveQueueHealth(editorial, launchWidgets)
    : null;

  return {
    fetchedAt,
    overallStatus: overall.status,
    overallLabel: overall.label,
    indicators,
    queueHealth,
    hasLayer: indicators.length > 0,
  };
}
