/**
 * Event Intelligence read model — canonical server-side view of news_events.
 * No AI, no new clustering, no schema changes.
 */

import { scoreSourceConfidence } from "@/lib/news/ai/event-clustering";
import { computeClusterConfidence } from "@/lib/news/coverage/confidence";
import {
  fetchEventCoverageBundle,
  fetchEventCoverageBundleById,
  type EventCoverageBundle,
} from "@/lib/news/coverage/fetch-event-bundle";
import {
  buildCoverageTimeline,
  type CoverageTimelineEntry,
} from "@/lib/news/coverage/timeline";
import type { CoverageUpdateRow, NewsSignalRow } from "@/lib/types/newsroom";

export type EventSourceAttribution = {
  signal_id?: string;
  source: string | null;
  provider: string;
  article_url?: string;
  published_at?: string | null;
  confidence?: number;
};

export type EventLatestUpdate = {
  id: string;
  headline: string;
  summary: string | null;
  update_type: string;
  is_breaking: boolean;
  published_at: string;
  cluster_confidence: number | null;
};

export type EventRelatedMetadata = {
  method?: string;
  cluster_size?: number;
  avg_similarity?: number;
  merge_reasons?: string[];
  last_merge_at?: string;
  merge_history_count?: number;
  embedding_ready?: boolean;
  urgency_score?: number;
  coverage_headline?: string | null;
  article_slug?: string | null;
  article_id?: string | null;
};

export type EventCoverageStatistics = {
  update_count: number;
  breaking_update_count: number;
  signal_count: number;
  source_count: number;
  provider_count: number;
  unique_source_count: number;
  first_update_at: string | null;
  last_update_at: string | null;
  cluster_confidence_score: number | null;
  cluster_confidence_label: "high" | "medium" | "low" | null;
};

export type EventViewModel = {
  event_id: string;
  canonical_title: string;
  summary: string | null;
  status: string;
  is_live: boolean;
  coverage_slug: string | null;
  cluster_confidence: number | null;
  region: string | null;
  category: string | null;
  signal_count: number;
  tracked_since: string | null;
  latest_update: EventLatestUpdate | null;
  recent_updates: EventLatestUpdate[];
  timeline: CoverageTimelineEntry[];
  source_attribution: EventSourceAttribution[];
  related_metadata: EventRelatedMetadata;
  coverage_statistics: EventCoverageStatistics;
};

function resolveSourceAttribution(
  bundle: EventCoverageBundle
): EventSourceAttribution[] {
  const meta = bundle.event.clustering_metadata as {
    source_attribution?: EventSourceAttribution[];
  };
  if (Array.isArray(meta.source_attribution) && meta.source_attribution.length) {
    return meta.source_attribution.map((entry) => ({
      signal_id: entry.signal_id,
      source: entry.source ?? null,
      provider: entry.provider ?? "wire",
      article_url: entry.article_url,
      published_at: entry.published_at ?? null,
      confidence: entry.confidence,
    }));
  }

  return bundle.signals.map((signal) => ({
    signal_id: signal.id,
    source: signal.source,
    provider: signal.provider,
    article_url: signal.article_url,
    published_at: signal.published_at,
    confidence: scoreSourceConfidence(signal),
  }));
}

function resolveRelatedMetadata(bundle: EventCoverageBundle): EventRelatedMetadata {
  const { event, article } = bundle;
  const meta = event.clustering_metadata as Record<string, unknown>;
  const mergeHistory = Array.isArray(meta.merge_history) ? meta.merge_history : [];

  const related: EventRelatedMetadata = {
    urgency_score: event.urgency_score,
    coverage_headline: event.coverage_headline,
  };

  if (typeof meta.method === "string") related.method = meta.method;
  if (typeof meta.cluster_size === "number") related.cluster_size = meta.cluster_size;
  if (typeof meta.avg_similarity === "number") {
    related.avg_similarity = meta.avg_similarity;
  }
  if (Array.isArray(meta.merge_reasons)) {
    related.merge_reasons = meta.merge_reasons as string[];
  }
  if (typeof meta.last_merge_at === "string") related.last_merge_at = meta.last_merge_at;
  if (mergeHistory.length) related.merge_history_count = mergeHistory.length;
  if (typeof meta.embedding_ready === "boolean") {
    related.embedding_ready = meta.embedding_ready;
  }
  if (article?.slug) related.article_slug = article.slug;
  if (article?.id) related.article_id = article.id;

  return related;
}

function mapCoverageUpdate(row: CoverageUpdateRow): EventLatestUpdate {
  return {
    id: row.id,
    headline: row.headline,
    summary: row.summary,
    update_type: row.update_type,
    is_breaking: row.is_breaking,
    published_at: row.published_at,
    cluster_confidence: row.cluster_confidence,
  };
}

function resolveRecentUpdates(
  bundle: EventCoverageBundle,
  limit = 5
): EventLatestUpdate[] {
  return bundle.updates.slice(0, limit).map(mapCoverageUpdate);
}

function resolveLatestUpdate(
  bundle: EventCoverageBundle
): EventLatestUpdate | null {
  const latest = bundle.updates[0];
  if (!latest) return null;
  return mapCoverageUpdate(latest);
}

function countUniqueSources(signals: NewsSignalRow[]): number {
  return new Set(signals.map((s) => s.source?.trim()).filter(Boolean)).size;
}

function countProviders(signals: NewsSignalRow[]): number {
  return new Set(signals.map((s) => s.provider)).size;
}

function resolveCoverageStatistics(
  bundle: EventCoverageBundle,
  confidence: ReturnType<typeof computeClusterConfidence>
): EventCoverageStatistics {
  const { event, updates, signals } = bundle;
  const sortedUpdates = [...updates].sort(
    (a, b) =>
      new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
  );

  return {
    update_count: updates.length,
    breaking_update_count: updates.filter((u) => u.is_breaking).length,
    signal_count: signals.length,
    source_count: event.source_count,
    provider_count: countProviders(signals),
    unique_source_count: countUniqueSources(signals),
    first_update_at: sortedUpdates[0]?.published_at ?? null,
    last_update_at: sortedUpdates[sortedUpdates.length - 1]?.published_at ?? null,
    cluster_confidence_score: confidence.score,
    cluster_confidence_label: confidence.label,
  };
}

function resolveAvgSimilarity(bundle: EventCoverageBundle): number {
  const meta = bundle.event.clustering_metadata as {
    cluster_confidence_report?: { avgSimilarity?: number };
    avg_similarity?: number;
  };

  return (
    meta.cluster_confidence_report?.avgSimilarity ??
    meta.avg_similarity ??
    Number(bundle.event.cluster_confidence) ??
    0.7
  );
}

export function buildEventViewModel(
  bundle: EventCoverageBundle
): EventViewModel {
  const { event, signals, updates, article } = bundle;

  const confidence = computeClusterConfidence({
    signals,
    avgSimilarity: resolveAvgSimilarity(bundle),
    mergeReasons: ["event_view_model"],
  });

  const timeline = buildCoverageTimeline({
    signals,
    updates,
    editorialPublishedAt: article?.published_at,
    editorialHeadline: article?.headline,
  });

  return {
    event_id: event.id,
    canonical_title: event.canonical_title,
    summary: event.event_summary,
    status: event.coverage_status,
    is_live: event.is_live,
    coverage_slug: event.coverage_slug,
    cluster_confidence: event.cluster_confidence,
    region: event.region,
    category: event.category,
    signal_count: event.source_count,
    tracked_since: event.created_at ?? null,
    latest_update: resolveLatestUpdate(bundle),
    recent_updates: resolveRecentUpdates(bundle),
    timeline,
    source_attribution: resolveSourceAttribution(bundle),
    related_metadata: resolveRelatedMetadata(bundle),
    coverage_statistics: resolveCoverageStatistics(bundle, confidence),
  };
}

export async function getEventViewModel(
  eventId: string
): Promise<EventViewModel | null> {
  const bundle = await fetchEventCoverageBundleById(eventId);
  if (!bundle) return null;
  return buildEventViewModel(bundle);
}

export async function getEventViewModelFromBundle(
  event: EventCoverageBundle["event"]
): Promise<EventViewModel> {
  const bundle = await fetchEventCoverageBundle(event);
  return buildEventViewModel(bundle);
}
