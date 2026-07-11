/**
 * Coverage Opportunity Intelligence — read-only editorial opportunities
 * from existing dashboard metadata. Pure aggregation; no AI, no I/O.
 */

import type {
  DashboardEventCluster,
  DashboardGeneratedArticle,
  EditorialDashboardSnapshot,
} from "@/lib/editorial-dashboard/types";
import type { WorkflowBoardSnapshot } from "@/lib/editorial-workflow/types";
import { WORKFLOW_LABELS, type WorkflowStatus } from "@/lib/editorial-workflow/types";

export type CoverageOpportunitySeverity = "high" | "medium" | "low";

export type CoverageOpportunityMetric = {
  label: string;
  value: string;
};

export type CoverageOpportunityItem = {
  id: string;
  title: string;
  reason: string;
  severity: CoverageOpportunitySeverity;
  metrics: CoverageOpportunityMetric[];
  recommendedAction: string;
  route: string;
};

export type CoverageOpportunityVm = {
  fetchedAt: string;
  opportunityCount: number;
  opportunities: CoverageOpportunityItem[];
  hasLayer: boolean;
};

export type BuildCoverageOpportunitiesInput = {
  editorial: EditorialDashboardSnapshot | null;
  workflowAnalytics?: WorkflowBoardSnapshot["analytics"] | null;
};

const SEVERITY_RANK: Record<CoverageOpportunitySeverity, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function isToday(iso: string | null | undefined): boolean {
  if (!iso?.trim()) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function hoursSince(iso: string | null | undefined): number | null {
  if (!iso?.trim()) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
}

function hasKnowledgeCoverage(article: DashboardGeneratedArticle): boolean {
  return Boolean(
    article.has_intelligence_v2 &&
      (article.entity_names.length > 0 ||
        article.reader_keywords.length > 0 ||
        article.tags.length > 0)
  );
}

function workflowLabel(status: string | null | undefined): string | null {
  if (!status?.trim()) return null;
  const normalized = status.trim().toLowerCase();
  if (normalized in WORKFLOW_LABELS) {
    return WORKFLOW_LABELS[normalized as WorkflowStatus];
  }
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function isReviewWorkflow(status: string | null | undefined): boolean {
  const normalized = status?.trim().toLowerCase();
  return (
    normalized === "draft" ||
    normalized === "review" ||
    normalized === "fact_check" ||
    normalized === "legal_review"
  );
}

function isEventLive(event: DashboardEventCluster): boolean {
  const meta = event.clustering_metadata ?? {};
  if (meta.is_live === true) return true;
  if (typeof meta.coverage_status === "string") {
    return meta.coverage_status.trim().toLowerCase() === "live";
  }
  return false;
}

function articlesForEvent(
  articles: DashboardGeneratedArticle[],
  eventId: string
): DashboardGeneratedArticle[] {
  return articles.filter((article) => article.event_id === eventId);
}

function articlesToday(articles: DashboardGeneratedArticle[]): DashboardGeneratedArticle[] {
  return articles.filter(
    (article) => isToday(article.published_at) || isToday(article.created_at)
  );
}

function pushOpportunity(
  list: CoverageOpportunityItem[],
  opportunity: CoverageOpportunityItem
): void {
  if (list.some((item) => item.id === opportunity.id)) return;
  list.push(opportunity);
}

function sortOpportunities(
  opportunities: CoverageOpportunityItem[]
): CoverageOpportunityItem[] {
  return [...opportunities].sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      a.title.localeCompare(b.title)
  );
}

function detectHighActivityLowCoverage(
  editorial: EditorialDashboardSnapshot,
  articles: DashboardGeneratedArticle[]
): CoverageOpportunityItem[] {
  const found: CoverageOpportunityItem[] = [];

  for (const event of editorial.eventClusters) {
    const linked = articlesForEvent(articles, event.id);
    const activity = Math.max(event.signal_count, event.source_count);
    const highActivity = activity >= 5 || event.urgency_score >= 0.7;
    const lowCoverage = linked.length === 0 || (activity >= 10 && linked.length <= 1);

    if (!highActivity || !lowCoverage) continue;

    pushOpportunity(found, {
      id: `event_low_coverage_${event.id}`,
      title: `High-activity event with limited coverage`,
      reason: `"${event.canonical_title}" has strong signal volume but few published articles in the snapshot.`,
      severity: linked.length === 0 ? "high" : "medium",
      metrics: [
        { label: "Event", value: event.canonical_title },
        { label: "Signals", value: `${event.signal_count}` },
        { label: "Sources", value: `${event.source_count}` },
        { label: "Linked articles", value: `${linked.length}` },
        { label: "Urgency", value: `${Math.round(event.urgency_score * 100)}%` },
      ],
      recommendedAction:
        "Review the event cluster and assign follow-up coverage in the newsroom workflow.",
      route: "/admin/intelligence",
    });
  }

  return found;
}

function detectBreakingAwaitingReview(
  articles: DashboardGeneratedArticle[],
  pendingReview: number
): CoverageOpportunityItem[] {
  const breakingPending = articles.filter(
    (article) =>
      article.is_breaking &&
      (article.editorial_status === "pending" || isReviewWorkflow(article.workflow_status))
  );

  if (!breakingPending.length) return [];

  return [
    {
      id: "breaking_awaiting_review",
      title: "Breaking stories awaiting editorial review",
      reason:
        "Breaking-flagged articles remain in pending or pre-publish workflow stages.",
      severity: "high",
      metrics: [
        { label: "Breaking in review", value: `${breakingPending.length}` },
        { label: "Pending review (board)", value: `${pendingReview}` },
        {
          label: "Sample headline",
          value: breakingPending[0]?.headline ?? "—",
        },
      ],
      recommendedAction:
        "Prioritize breaking items in the workflow board before scheduling publication.",
      route: "/admin/workflow",
    },
  ];
}

function detectDistrictLowCoverageToday(
  editorial: EditorialDashboardSnapshot,
  todayArticles: DashboardGeneratedArticle[]
): CoverageOpportunityItem[] {
  const districtsWithSignals = new Set<string>();
  const todayDistrictCounts = new Map<string, number>();

  for (const event of editorial.eventClusters) {
    const district = event.region?.trim();
    if (district && (event.signal_count >= 2 || event.source_count >= 2)) {
      districtsWithSignals.add(district);
    }
  }

  for (const article of todayArticles) {
    const district = article.district?.trim();
    if (!district) continue;
    todayDistrictCounts.set(district, (todayDistrictCounts.get(district) ?? 0) + 1);
  }

  const sparse = [...districtsWithSignals].filter(
    (district) => (todayDistrictCounts.get(district) ?? 0) <= 1
  );

  if (!sparse.length) return [];

  const sample = sparse.slice(0, 3).join(", ");

  return [
    {
      id: "district_low_coverage_today",
      title: "Districts with little coverage today",
      reason:
        "Active event regions in the snapshot have at most one article published or created today.",
      severity: sparse.length >= 3 ? "medium" : "low",
      metrics: [
        { label: "Districts affected", value: `${sparse.length}` },
        { label: "Examples", value: sample },
        {
          label: "Articles today (snapshot)",
          value: `${todayArticles.length}`,
        },
      ],
      recommendedAction:
        "Check district desks for follow-up stories on under-covered regions.",
      route: "/admin/districts",
    },
  ];
}

function detectCategoryLowActivity(
  editorial: EditorialDashboardSnapshot,
  todayArticles: DashboardGeneratedArticle[]
): CoverageOpportunityItem[] {
  const activeCategories = new Map<string, number>();

  for (const event of editorial.eventClusters) {
    const category = event.category?.trim();
    if (!category) continue;
    const activity = Math.max(event.signal_count, event.source_count);
    if (activity < 3) continue;
    activeCategories.set(
      category,
      Math.max(activeCategories.get(category) ?? 0, activity)
    );
  }

  const todayCategories = new Set(
    todayArticles
      .map((article) => article.category_label ?? article.tags[0] ?? null)
      .filter((label): label is string => Boolean(label?.trim()))
  );

  const quiet = [...activeCategories.entries()].filter(
    ([category]) => !todayCategories.has(category)
  );

  if (!quiet.length) return [];

  const [topCategory, topActivity] = quiet.sort((a, b) => b[1] - a[1])[0];

  return [
    {
      id: "category_low_activity_today",
      title: "Categories with very low activity today",
      reason:
        "Event clusters show category signal volume, but no matching articles were touched today.",
      severity: quiet.length >= 2 ? "medium" : "low",
      metrics: [
        { label: "Quiet categories", value: `${quiet.length}` },
        { label: "Top inactive category", value: topCategory },
        { label: "Event signal volume", value: `${topActivity}` },
      ],
      recommendedAction:
        "Review category desks for stories that match active event clusters.",
      route: "/admin/editorial",
    },
  ];
}

function detectEventClustersLackingFollowUp(
  editorial: EditorialDashboardSnapshot,
  articles: DashboardGeneratedArticle[]
): CoverageOpportunityItem[] {
  const found: CoverageOpportunityItem[] = [];

  for (const event of editorial.eventClusters) {
    const ageHours = hoursSince(event.created_at);
    if (ageHours == null || ageHours < 24) continue;
    if (event.signal_count < 5 && event.source_count < 5) continue;

    const linked = articlesForEvent(articles, event.id);
    const recentLinked = linked.filter(
      (article) =>
        isToday(article.published_at) || isToday(article.created_at)
    );

    if (recentLinked.length > 0) continue;

    pushOpportunity(found, {
      id: `event_no_followup_${event.id}`,
      title: "Event cluster lacking recent follow-up",
      reason:
        "An older high-signal event has no articles published or created today in the snapshot.",
      severity: "medium",
      metrics: [
        { label: "Event", value: event.canonical_title },
        { label: "Age (hours)", value: `${Math.round(ageHours)}` },
        { label: "Signals", value: `${event.signal_count}` },
        { label: "Linked articles", value: `${linked.length}` },
      ],
      recommendedAction:
        "Assign a follow-up update or live brief for this event cluster.",
      route: "/admin/intelligence",
    });
  }

  return found;
}

function detectSingletonEntities(
  articles: DashboardGeneratedArticle[]
): CoverageOpportunityItem[] {
  const entityArticles = new Map<string, DashboardGeneratedArticle[]>();

  for (const article of articles) {
    for (const entity of article.entity_names) {
      const label = entity.trim();
      if (!label) continue;
      const bucket = entityArticles.get(label) ?? [];
      bucket.push(article);
      entityArticles.set(label, bucket);
    }
  }

  const found: CoverageOpportunityItem[] = [];

  for (const [entity, linked] of entityArticles.entries()) {
    if (linked.length !== 1) continue;
    const article = linked[0];
    const tiedToEvent = Boolean(article.event_id);
    const highSourceVolume = (article.source_count ?? 0) >= 4;
    if (!tiedToEvent && !highSourceVolume) continue;

    pushOpportunity(found, {
      id: `singleton_entity_${entity.toLowerCase().replace(/\s+/g, "_")}`,
      title: `Entity "${entity}" appears only once`,
      reason:
        "A notable entity is attached to a single article despite event linkage or high source volume.",
      severity: "low",
      metrics: [
        { label: "Entity", value: entity },
        { label: "Article", value: article.headline },
        { label: "Event-linked", value: tiedToEvent ? "Yes" : "No" },
        { label: "Sources", value: `${article.source_count ?? 0}` },
      ],
      recommendedAction:
        "Consider additional coverage angles mentioning this entity.",
      route: "/admin/stories",
    });
  }

  return found.slice(0, 3);
}

function detectRepairedCategoryCluster(
  articles: DashboardGeneratedArticle[]
): CoverageOpportunityItem[] {
  const repairedByCategory = new Map<string, number>();

  for (const article of articles) {
    if (!article.repaired) continue;
    const category = article.category_label ?? article.tags[0] ?? "Uncategorized";
    repairedByCategory.set(category, (repairedByCategory.get(category) ?? 0) + 1);
  }

  const clusters = [...repairedByCategory.entries()].filter(([, count]) => count >= 2);
  if (!clusters.length) return [];

  const [topCategory, topCount] = clusters.sort((a, b) => b[1] - a[1])[0];

  return [
    {
      id: "repaired_category_cluster",
      title: "Many repaired articles in the same category",
      reason:
        "Editorial repair metadata clusters in one category, indicating recurring quality gaps.",
      severity: topCount >= 3 ? "medium" : "low",
      metrics: [
        { label: "Top category", value: topCategory },
        { label: "Repaired articles", value: `${topCount}` },
        { label: "Categories affected", value: `${clusters.length}` },
      ],
      recommendedAction:
        "Review editorial prompts and source mix for this category before publishing.",
      route: "/admin/editorial",
    },
  ];
}

function detectFallbackWorkflowStage(
  articles: DashboardGeneratedArticle[]
): CoverageOpportunityItem[] {
  const stageTotals = new Map<string, { total: number; fallback: number }>();

  for (const article of articles) {
    const stage = workflowLabel(article.workflow_status) ?? "Unassigned";
    const bucket = stageTotals.get(stage) ?? { total: 0, fallback: 0 };
    bucket.total += 1;
    if (article.used_fallback) bucket.fallback += 1;
    stageTotals.set(stage, bucket);
  }

  const found: CoverageOpportunityItem[] = [];

  for (const [stage, stats] of stageTotals.entries()) {
    if (stats.total < 2) continue;
    const rate = stats.fallback / stats.total;
    if (rate < 0.5) continue;

    pushOpportunity(found, {
      id: `fallback_stage_${stage.toLowerCase().replace(/\s+/g, "_")}`,
      title: `High fallback usage in ${stage}`,
      reason:
        "More than half of articles in this workflow stage used generation fallback metadata.",
      severity: rate >= 0.75 ? "medium" : "low",
      metrics: [
        { label: "Workflow stage", value: stage },
        { label: "Articles", value: `${stats.total}` },
        { label: "Fallback count", value: `${stats.fallback}` },
        { label: "Fallback rate", value: `${Math.round(rate * 100)}%` },
      ],
      recommendedAction:
        "Inspect source health and repair queue for this workflow stage.",
      route: "/admin/workflow",
    });
  }

  return found;
}

function detectLiveEventSparseUpdates(
  editorial: EditorialDashboardSnapshot,
  articles: DashboardGeneratedArticle[]
): CoverageOpportunityItem[] {
  const found: CoverageOpportunityItem[] = [];

  for (const event of editorial.eventClusters) {
    if (!isEventLive(event)) continue;

    const ageHours = hoursSince(event.created_at);
    if (ageHours == null || ageHours < 6) continue;

    const linked = articlesForEvent(articles, event.id);
    if (linked.length > 1) continue;

    pushOpportunity(found, {
      id: `live_sparse_${event.id}`,
      title: "Long-running live event with few updates",
      reason:
        "A live-flagged event cluster is older than six hours but has at most one linked article.",
      severity: "high",
      metrics: [
        { label: "Event", value: event.canonical_title },
        { label: "Age (hours)", value: `${Math.round(ageHours)}` },
        { label: "Linked articles", value: `${linked.length}` },
        { label: "Signals", value: `${event.signal_count}` },
      ],
      recommendedAction:
        "Publish a live-wire update or assign a desk editor to refresh coverage.",
      route: "/admin/live-wire",
    });
  }

  return found;
}

function detectSparseKnowledgeCoverage(
  articles: DashboardGeneratedArticle[]
): CoverageOpportunityItem[] {
  const sparse = articles.filter(
    (article) =>
      !hasKnowledgeCoverage(article) &&
      (article.event_id || article.is_breaking || article.has_intelligence_v2)
  );

  if (sparse.length < 3) return [];

  const eventLinked = sparse.filter((article) => article.event_id).length;
  const breaking = sparse.filter((article) => article.is_breaking).length;

  return [
    {
      id: "sparse_knowledge_coverage",
      title: "Sparse knowledge coverage on active stories",
      reason:
        "Several event-linked or breaking articles lack V2 entities, keywords, or tags.",
      severity: sparse.length >= 5 ? "medium" : "low",
      metrics: [
        { label: "Affected articles", value: `${sparse.length}` },
        { label: "Event-linked", value: `${eventLinked}` },
        { label: "Breaking", value: `${breaking}` },
      ],
      recommendedAction:
        "Enrich intelligence metadata before publication to improve discoverability.",
      route: "/admin/stories",
    },
  ];
}

function resolvePendingReview(
  editorial: EditorialDashboardSnapshot,
  workflowAnalytics?: WorkflowBoardSnapshot["analytics"] | null
): number {
  if (workflowAnalytics?.pending_review != null) {
    return workflowAnalytics.pending_review;
  }
  return editorial.counts.pending;
}

export function buildCoverageOpportunities(
  input: BuildCoverageOpportunitiesInput
): CoverageOpportunityVm {
  const { editorial, workflowAnalytics } = input;

  if (!editorial) {
    return {
      fetchedAt: new Date().toISOString(),
      opportunityCount: 0,
      opportunities: [],
      hasLayer: false,
    };
  }

  const articles = editorial.generatedArticles;
  const todayArticles = articlesToday(articles);
  const pendingReview = resolvePendingReview(editorial, workflowAnalytics);

  const opportunities = sortOpportunities([
    ...detectHighActivityLowCoverage(editorial, articles),
    ...detectBreakingAwaitingReview(articles, pendingReview),
    ...detectDistrictLowCoverageToday(editorial, todayArticles),
    ...detectCategoryLowActivity(editorial, todayArticles),
    ...detectEventClustersLackingFollowUp(editorial, articles),
    ...detectSingletonEntities(articles),
    ...detectRepairedCategoryCluster(articles),
    ...detectFallbackWorkflowStage(articles),
    ...detectLiveEventSparseUpdates(editorial, articles),
    ...detectSparseKnowledgeCoverage(articles),
  ]).slice(0, 12);

  return {
    fetchedAt: editorial.fetchedAt,
    opportunityCount: opportunities.length,
    opportunities,
    hasLayer: opportunities.length > 0,
  };
}
