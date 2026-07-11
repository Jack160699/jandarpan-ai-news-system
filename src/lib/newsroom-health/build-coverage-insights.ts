/**
 * Coverage Insights — newsroom-wide intelligence analytics from dashboard snapshot.
 * Pure aggregation; no AI, no additional queries.
 */

import type {
  DashboardGeneratedArticle,
  EditorialDashboardSnapshot,
} from "@/lib/editorial-dashboard/types";
import type { WorkflowBoardSnapshot } from "@/lib/editorial-workflow/types";
import { WORKFLOW_LABELS, type WorkflowStatus } from "@/lib/editorial-workflow/types";

export type CoverageInsightRankedItem = {
  label: string;
  count: number;
};

export type CoverageInsightKpi = {
  id: string;
  label: string;
  value: string;
  detail: string | null;
};

export type CoverageInsightsVm = {
  fetchedAt: string;
  sampleSize: number;
  kpis: CoverageInsightKpi[];
  topCategoriesToday: CoverageInsightRankedItem[];
  topDistricts: CoverageInsightRankedItem[];
  topEntities: CoverageInsightRankedItem[];
  activeEvents: CoverageInsightRankedItem[];
  workflowStages: CoverageInsightRankedItem[];
  publishDecisions: CoverageInsightRankedItem[];
  hasLayer: boolean;
};

export type BuildCoverageInsightsInput = {
  editorial: EditorialDashboardSnapshot | null;
  workflowAnalytics?: WorkflowBoardSnapshot["analytics"] | null;
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

function formatPercent(value: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((value / total) * 100)}%`;
}

function formatAverage(value: number): string {
  return `${Math.round(value * 100) / 100}`;
}

function rankCounts(
  entries: Array<string | null | undefined>,
  limit = 5
): CoverageInsightRankedItem[] {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    const label = entry?.trim();
    if (!label) continue;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function articlesToday(articles: DashboardGeneratedArticle[]): DashboardGeneratedArticle[] {
  return articles.filter(
    (article) =>
      isToday(article.published_at) || isToday(article.created_at)
  );
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

export function buildCoverageInsights(
  input: BuildCoverageInsightsInput
): CoverageInsightsVm {
  const { editorial, workflowAnalytics } = input;

  if (!editorial) {
    return {
      fetchedAt: new Date().toISOString(),
      sampleSize: 0,
      kpis: [],
      topCategoriesToday: [],
      topDistricts: [],
      topEntities: [],
      activeEvents: [],
      workflowStages: [],
      publishDecisions: [],
      hasLayer: false,
    };
  }

  const articles = editorial.generatedArticles;
  const total = articles.length;
  const todayArticles = articlesToday(articles);
  const counts = editorial.counts;

  const confidenceValues = articles
    .map((article) => article.ai_confidence)
    .filter((value): value is number => typeof value === "number");
  const avgConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((sum, value) => sum + value, 0) /
        confidenceValues.length
      : null;

  const sourceValues = articles
    .map((article) => article.source_count)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const avgSources =
    sourceValues.length > 0
      ? sourceValues.reduce((sum, value) => sum + value, 0) /
        sourceValues.length
      : null;

  const v2Count = articles.filter((article) => article.has_intelligence_v2).length;
  const knowledgeCount = articles.filter(hasKnowledgeCoverage).length;
  const fallbackCount = articles.filter((article) => article.used_fallback).length;
  const repairCount = articles.filter((article) => article.repaired).length;
  const eventLinkedCount = articles.filter((article) => article.event_id).length;
  const breakingCount = articles.filter((article) => article.is_breaking).length;

  const kpis: CoverageInsightKpi[] = [];

  if (avgConfidence != null) {
    kpis.push({
      id: "avg_confidence",
      label: "Average AI confidence",
      value: `${Math.round(avgConfidence * 100)}%`,
      detail: `${confidenceValues.length} articles with confidence metadata`,
    });
  }

  if (avgSources != null) {
    kpis.push({
      id: "avg_sources",
      label: "Average sources per article",
      value: formatAverage(avgSources),
      detail: `${sourceValues.length} articles with source counts`,
    });
  }

  if (total > 0) {
    kpis.push({
      id: "v2_intelligence",
      label: "Articles with V2 intelligence",
      value: formatPercent(v2Count, total),
      detail: `${v2Count} of ${total} in snapshot`,
    });
    kpis.push({
      id: "knowledge_coverage",
      label: "Knowledge coverage",
      value: formatPercent(knowledgeCount, total),
      detail: "V2 intelligence with entities, keywords, or tags",
    });
    kpis.push({
      id: "event_linked",
      label: "Event-linked articles",
      value: formatPercent(eventLinkedCount, total),
      detail: `${counts.eventLinkedArticles} event-linked in counts`,
    });
    kpis.push({
      id: "breaking",
      label: "Breaking articles",
      value: formatPercent(breakingCount, total),
      detail: `${editorial.trending.breakingCount} breaking in trending`,
    });
    kpis.push({
      id: "fallback_usage",
      label: "Fallback usage",
      value: formatPercent(fallbackCount, total),
      detail: `${counts.fallbackArticles} with used_fallback metadata`,
    });
    kpis.push({
      id: "repair_rate",
      label: "Editorial repair rate",
      value: formatPercent(repairCount, total),
      detail: `${counts.repairedArticles} with repaired metadata`,
    });
    kpis.push({
      id: "published_today",
      label: "Published today",
      value: `${counts.publishedToday}`,
      detail: `${todayArticles.length} articles touched today in snapshot`,
    });
  }

  const topCategoriesToday = rankCounts(
    todayArticles.map((article) => article.category_label ?? article.tags[0] ?? null)
  );

  const topDistricts = rankCounts(
    articles.map((article) => article.district)
  );

  const topEntities = rankCounts(
    articles.flatMap((article) => article.entity_names)
  );

  const activeEvents = [...editorial.eventClusters]
    .sort(
      (a, b) =>
        b.urgency_score - a.urgency_score ||
        b.signal_count - a.signal_count ||
        b.source_count - a.source_count
    )
    .slice(0, 5)
    .map((event) => ({
      label: event.canonical_title,
      count: Math.max(event.signal_count, event.source_count, 1),
    }));

  const workflowStages =
    workflowAnalytics?.by_status
      ? Object.entries(workflowAnalytics.by_status)
          .filter(([, count]) => count > 0)
          .map(([status, count]) => ({
            label: workflowLabel(status) ?? status,
            count,
          }))
          .sort((a, b) => b.count - a.count)
      : rankCounts(articles.map((article) => workflowLabel(article.workflow_status)));

  const publishDecisions = rankCounts(
    articles.map((article) => {
      const decision = article.publish_decision?.trim().toLowerCase();
      if (!decision) return null;
      if (decision === "publish") return "Cleared for publication";
      if (decision === "repair") return "Editorial repair";
      if (decision === "reject") return "Rejected";
      return article.publish_decision;
    })
  );

  const vm: CoverageInsightsVm = {
    fetchedAt: editorial.fetchedAt,
    sampleSize: total,
    kpis,
    topCategoriesToday,
    topDistricts,
    topEntities,
    activeEvents,
    workflowStages,
    publishDecisions,
    hasLayer: false,
  };

  vm.hasLayer = Boolean(
    vm.kpis.length ||
      vm.topCategoriesToday.length ||
      vm.topDistricts.length ||
      vm.topEntities.length ||
      vm.activeEvents.length ||
      vm.workflowStages.length ||
      vm.publishDecisions.length
  );

  return vm;
}
