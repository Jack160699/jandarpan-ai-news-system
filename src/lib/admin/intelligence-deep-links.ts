/**
 * Intelligence deep links — contextual admin navigation from existing VMs.
 * Pure URL projection; no fetching, no new routes.
 */

import type { ExecutiveDigestRecommendation } from "@/lib/admin/executive-digest";
import {
  buildEditorialDeskHref,
  buildLiveWireDeskHref,
  buildNewsroomSearchHref,
  buildStoriesDeskHref,
  buildWorkflowDeskHref,
} from "@/lib/admin/admin-desk-query";
import type { CoverageInsightRankedItem } from "@/lib/newsroom-health/build-coverage-insights";
import type { CoverageOpportunityItem } from "@/lib/newsroom-health/build-coverage-opportunities";
import { WORKFLOW_LABELS, type WorkflowStatus } from "@/lib/editorial-workflow/types";

export type IntelligenceDeepLink = {
  label: string;
  href: string;
  ariaLabel: string;
};

function link(label: string, href: string, ariaLabel: string): IntelligenceDeepLink {
  return { label, href, ariaLabel };
}

/** Static workflow desk links — reused across intelligence panels. */
export const WORKFLOW_DIGEST_DEEP_LINKS: IntelligenceDeepLink[] = [
  link("Workflow board", "/admin/workflow", "Open workflow board"),
  link("Editorial overview", "/admin/editorial", "Open editorial overview"),
];

function pushUnique(
  links: IntelligenceDeepLink[],
  entry: IntelligenceDeepLink | null
): void {
  if (!entry?.href?.trim()) return;
  if (links.some((item) => item.href === entry.href && item.label === entry.label)) {
    return;
  }
  links.push(entry);
}

function metricValue(
  item: CoverageOpportunityItem,
  label: string
): string | null {
  const value = item.metrics.find((metric) => metric.label === label)?.value?.trim();
  return value || null;
}

function workflowStatusFromLabel(label: string | null | undefined): string | null {
  if (!label?.trim()) return null;
  const normalized = label.trim().toLowerCase();
  for (const [status, workflowLabel] of Object.entries(WORKFLOW_LABELS) as Array<
    [WorkflowStatus, string]
  >) {
    if (workflowLabel.toLowerCase() === normalized) return status;
  }
  const slug = normalized.replace(/\s+/g, "_");
  if (slug in WORKFLOW_LABELS) return slug;
  return null;
}

export function buildOpportunityDeepLinks(
  item: CoverageOpportunityItem
): IntelligenceDeepLink[] {
  const links: IntelligenceDeepLink[] = [];
  const eventTitle = metricValue(item, "Event");
  const entity = metricValue(item, "Entity");
  const category =
    metricValue(item, "Top category") ??
    metricValue(item, "Top inactive category");
  const districtExamples = metricValue(item, "Examples");
  const district = districtExamples?.split(",")[0]?.trim() ?? null;
  const workflowStage = metricValue(item, "Workflow stage");
  const workflowStatus = workflowStatusFromLabel(workflowStage);

  if (item.id.startsWith("event_") || item.id.startsWith("live_sparse_")) {
    if (eventTitle) {
      pushUnique(
        links,
        link(
          "View on live wire",
          buildLiveWireDeskHref({ event: eventTitle }),
          `Open live wire for ${eventTitle}`
        )
      );
      pushUnique(
        links,
        link(
          "Search event",
          buildNewsroomSearchHref(eventTitle),
          `Search newsroom for ${eventTitle}`
        )
      );
    }
    pushUnique(
      links,
      link(
        "Intelligence center",
        "/admin/intelligence",
        "Open intelligence center"
      )
    );
  }

  if (item.id === "breaking_awaiting_review") {
    pushUnique(
      links,
      link(
        "Workflow review queue",
        buildWorkflowDeskHref({ status: "review" }),
        "Open workflow board filtered to review"
      )
    );
    pushUnique(
      links,
      link(
        "Breaking stories",
        buildEditorialDeskHref({ breaking: true }),
        "Open editorial desk filtered to breaking stories"
      )
    );
  }

  if (item.id === "district_low_coverage_today" && district) {
    pushUnique(
      links,
      link(
        `District: ${district}`,
        buildEditorialDeskHref({ district }),
        `Open editorial desk for ${district}`
      )
    );
    pushUnique(
      links,
      link("Districts desk", "/admin/districts", "Open districts admin desk")
    );
  }

  if (item.id === "category_low_activity_today" && category) {
    pushUnique(
      links,
      link(
        `Category: ${category}`,
        buildEditorialDeskHref({ category }),
        `Open editorial desk for ${category}`
      )
    );
  }

  if (item.id.startsWith("singleton_entity_") && entity) {
    pushUnique(
      links,
      link(
        `Stories tagged ${entity}`,
        buildStoriesDeskHref({ tag: entity }),
        `Open stories desk filtered to ${entity}`
      )
    );
    pushUnique(
      links,
      link(
        `Search ${entity}`,
        buildNewsroomSearchHref(entity),
        `Search newsroom for ${entity}`
      )
    );
  }

  if (item.id === "repaired_category_cluster" && category) {
    pushUnique(
      links,
      link(
        `Editorial: ${category}`,
        buildEditorialDeskHref({ category }),
        `Open editorial desk for ${category}`
      )
    );
  }

  if (item.id.startsWith("fallback_stage_") && workflowStatus) {
    pushUnique(
      links,
      link(
        `Workflow: ${workflowStage ?? workflowStatus}`,
        buildWorkflowDeskHref({ status: workflowStatus }),
        `Open workflow board at ${workflowStage ?? workflowStatus}`
      )
    );
  }

  if (item.id === "sparse_knowledge_coverage") {
    pushUnique(
      links,
      link("Stories desk", "/admin/stories", "Open stories desk")
    );
    pushUnique(
      links,
      link(
        "Workflow board",
        buildWorkflowDeskHref({ status: "review" }),
        "Open workflow review queue"
      )
    );
  }

  if (item.route.startsWith("/admin/")) {
    pushUnique(
      links,
      link(
        "Suggested desk",
        item.route,
        `Open ${item.route.replace("/admin/", "").replace(/-/g, " ")} desk`
      )
    );
  }

  return links;
}

export type InsightDeepLinkInput = {
  kind: "category" | "district" | "entity" | "event" | "workflow" | "kpi";
  label: string;
  kpiId?: string;
};

export function buildInsightDeepLinks(
  input: InsightDeepLinkInput
): IntelligenceDeepLink[] {
  const links: IntelligenceDeepLink[] = [];
  const { kind, label, kpiId } = input;
  const trimmed = label.trim();
  if (!trimmed) return links;

  if (kind === "category") {
    pushUnique(
      links,
      link(
        `Editorial: ${trimmed}`,
        buildEditorialDeskHref({ category: trimmed }),
        `Open editorial desk for category ${trimmed}`
      )
    );
    pushUnique(
      links,
      link(
        `Stories: ${trimmed}`,
        buildStoriesDeskHref({ category: trimmed }),
        `Open stories desk for category ${trimmed}`
      )
    );
  }

  if (kind === "district") {
    pushUnique(
      links,
      link(
        `Editorial: ${trimmed}`,
        buildEditorialDeskHref({ district: trimmed }),
        `Open editorial desk for district ${trimmed}`
      )
    );
    pushUnique(
      links,
      link("Districts desk", "/admin/districts", "Open districts admin desk")
    );
  }

  if (kind === "entity") {
    pushUnique(
      links,
      link(
        `Stories: ${trimmed}`,
        buildStoriesDeskHref({ tag: trimmed }),
        `Open stories desk for entity ${trimmed}`
      )
    );
    pushUnique(
      links,
      link(
        `Search: ${trimmed}`,
        buildNewsroomSearchHref(trimmed),
        `Search newsroom for ${trimmed}`
      )
    );
  }

  if (kind === "event") {
    pushUnique(
      links,
      link(
        "Live wire",
        buildLiveWireDeskHref({ event: trimmed }),
        `Open live wire for ${trimmed}`
      )
    );
    pushUnique(
      links,
      link(
        `Search: ${trimmed}`,
        buildNewsroomSearchHref(trimmed),
        `Search newsroom for ${trimmed}`
      )
    );
    pushUnique(
      links,
      link(
        "Intelligence center",
        "/admin/intelligence",
        "Open intelligence center"
      )
    );
  }

  if (kind === "workflow") {
    const status = workflowStatusFromLabel(trimmed);
    pushUnique(
      links,
      link(
        `Workflow: ${trimmed}`,
        buildWorkflowDeskHref({ status: status ?? trimmed }),
        `Open workflow board for ${trimmed}`
      )
    );
  }

  if (kind === "kpi") {
    if (kpiId === "breaking") {
      pushUnique(
        links,
        link(
          "Breaking stories",
          buildEditorialDeskHref({ breaking: true }),
          "Open editorial desk filtered to breaking stories"
        )
      );
    }
    if (kpiId === "published_today") {
      pushUnique(
        links,
        link("Editorial overview", "/admin/editorial", "Open editorial overview")
      );
    }
    if (kpiId === "fallback_usage" || kpiId === "repair_rate") {
      pushUnique(
        links,
        link("Workflow board", "/admin/workflow", "Open workflow board")
      );
    }
    if (kpiId === "event_linked") {
      pushUnique(
        links,
        link("Live wire", "/admin/live-wire", "Open admin live wire desk")
      );
    }
    pushUnique(
      links,
      link("Editorial overview", "/admin/editorial", "Open editorial overview")
    );
  }

  return links;
}

export function buildInsightDeepLinksForRanked(
  title: string,
  item: CoverageInsightRankedItem
): IntelligenceDeepLink[] {
  const normalized = title.toLowerCase();
  if (normalized.includes("categor")) {
    return buildInsightDeepLinks({ kind: "category", label: item.label });
  }
  if (normalized.includes("district")) {
    return buildInsightDeepLinks({ kind: "district", label: item.label });
  }
  if (normalized.includes("entit")) {
    return buildInsightDeepLinks({ kind: "entity", label: item.label });
  }
  if (normalized.includes("event")) {
    return buildInsightDeepLinks({ kind: "event", label: item.label });
  }
  if (normalized.includes("workflow")) {
    return buildInsightDeepLinks({ kind: "workflow", label: item.label });
  }
  return buildInsightDeepLinks({ kind: "kpi", label: item.label });
}

export type DigestDeepLinkInput =
  | {
      type: "opportunity";
      opportunity: CoverageOpportunityItem;
    }
  | {
      type: "recommendation";
      recommendation: ExecutiveDigestRecommendation;
    }
  | {
      type: "ranked";
      title: string;
      item: CoverageInsightRankedItem;
    }
  | {
      type: "workflow";
    }
  | {
      type: "launch";
      label: string;
    };

export function buildDigestDeepLinks(
  input: DigestDeepLinkInput
): IntelligenceDeepLink[] {
  if (input.type === "opportunity") {
    return buildOpportunityDeepLinks(input.opportunity);
  }

  if (input.type === "recommendation") {
    const opportunityLike: CoverageOpportunityItem = {
      id: input.recommendation.id,
      title: input.recommendation.title,
      reason: input.recommendation.action,
      severity:
        input.recommendation.severity === "high" ||
        input.recommendation.severity === "medium" ||
        input.recommendation.severity === "low"
          ? input.recommendation.severity
          : "medium",
      metrics: [],
      recommendedAction: input.recommendation.action,
      route: input.recommendation.route,
    };
    return buildOpportunityDeepLinks(opportunityLike);
  }

  if (input.type === "ranked") {
    return buildInsightDeepLinksForRanked(input.title, input.item);
  }

  if (input.type === "workflow") {
    return WORKFLOW_DIGEST_DEEP_LINKS;
  }

  return [
    link("Health dashboard", "/admin/health", "Open newsroom health dashboard"),
    link(
      `Launch: ${input.label}`,
      "/admin/health",
      `Open health dashboard for ${input.label}`
    ),
  ];
}
