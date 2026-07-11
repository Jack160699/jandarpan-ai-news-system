/**
 * Read evolving coverage bundles for /live/[slug] pages
 */

import { computeClusterConfidence } from "@/lib/news/coverage/confidence";
import {
  fetchEventCoverageBundle,
  fetchEventRowByCoverageSlug,
} from "@/lib/news/coverage/fetch-event-bundle";
import {
  buildLiveUpdateBlocks,
  type CoverageTimelineEntry,
} from "@/lib/news/coverage/timeline";
import { buildEventViewModel } from "@/lib/events/event-view-model";
import type {
  CoverageUpdateRow,
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";
import { createAnonServerClient, isSupabaseConfigured } from "@/lib/supabase";

export type LiveUpdateBlock = {
  id: string;
  headline: string;
  summary: string | null;
  publishedAt: string;
  isBreaking: boolean;
  sources: Array<{ name: string; confidence: number; url?: string }>;
  clusterConfidence: number | null;
};

export type EvolvingCoverageBundle = {
  event: NewsEventRow;
  signals: NewsSignalRow[];
  updates: CoverageUpdateRow[];
  article: GeneratedArticleRow | null;
  timeline: CoverageTimelineEntry[];
  liveBlocks: LiveUpdateBlock[];
  confidence: ReturnType<typeof computeClusterConfidence>;
};

function resolveAvgSimilarity(event: NewsEventRow): number {
  const meta = event.clustering_metadata as {
    cluster_confidence_report?: { avgSimilarity?: number };
  };
  return (
    meta.cluster_confidence_report?.avgSimilarity ??
    Number(event.cluster_confidence) ??
    0.7
  );
}

export async function getEvolvingCoverageBySlug(
  slug: string
): Promise<EvolvingCoverageBundle | null> {
  const eventRow = await fetchEventRowByCoverageSlug(slug, { liveOnly: true });
  if (!eventRow) return null;

  const bundle = await fetchEventCoverageBundle(eventRow);
  const { event, signals, updates, article } = bundle;
  const viewModel = buildEventViewModel(bundle);

  const confidence = computeClusterConfidence({
    signals,
    avgSimilarity: resolveAvgSimilarity(event),
    mergeReasons: ["evolving_coverage_page"],
  });

  const liveBlocks = buildLiveUpdateBlocks(updates, signals);

  return {
    event,
    signals,
    updates,
    article,
    timeline: viewModel.timeline,
    liveBlocks,
    confidence,
  };
}

export async function getLiveCoverageSlugs(limit = 40): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAnonServerClient();
  const { data } = await supabase
    .from("news_events")
    .select("coverage_slug")
    .eq("is_live", true)
    .not("coverage_slug", "is", null)
    .order("updated_at", { ascending: false })
    .limit(limit);

  return (data ?? [])
    .map((r) => r.coverage_slug as string)
    .filter(Boolean);
}
