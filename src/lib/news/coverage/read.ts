/**
 * Read evolving coverage bundles for /live/[slug] pages
 */

import {
  createAdminServerClient,
  createAnonServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { computeClusterConfidence } from "@/lib/news/coverage/confidence";
import {
  buildCoverageTimeline,
  buildLiveUpdateBlocks,
  type CoverageTimelineEntry,
} from "@/lib/news/coverage/timeline";
import type {
  CoverageUpdateRow,
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";

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

const EVENT_SELECT =
  "id,canonical_title,event_summary,region,category,urgency_score,source_count,signal_ids,clustering_metadata,coverage_slug,coverage_headline,cluster_confidence,is_live,coverage_status,created_at,updated_at";

const ARTICLE_SELECT =
  "id,event_id,slug,headline,summary,article_body,hero_image_url,seo_title,seo_description,reading_time,language,tags,published_at,editorial_status,editorial_metadata,created_at";

export async function getEvolvingCoverageBySlug(
  slug: string
): Promise<EvolvingCoverageBundle | null> {
  if (!isSupabaseConfigured()) return null;

  const decoded = decodeURIComponent(slug);
  const supabase = createAnonServerClient();

  const { data: event, error } = await supabase
    .from("news_events")
    .select(EVENT_SELECT)
    .eq("coverage_slug", decoded)
    .eq("is_live", true)
    .maybeSingle();

  if (error || !event) return null;

  const eventRow = event as NewsEventRow;
  const signalIds = eventRow.signal_ids ?? [];

  let signals: NewsSignalRow[] = [];
  if (signalIds.length) {
    const admin = createAdminServerClient();
    const { data: sigs } = await admin
      .from("news_signals")
      .select("*")
      .in("id", signalIds);
    signals = (sigs ?? []) as NewsSignalRow[];
  }

  if (!signals.length) {
    const metaSources = (
      eventRow.clustering_metadata as { sources?: Array<Record<string, unknown>> }
    )?.sources;
    if (Array.isArray(metaSources)) {
      signals = metaSources.map(
        (s, i) =>
          ({
            id: (s.id as string) ?? `meta-${i}`,
            source: (s.source as string) ?? null,
            provider: (s.provider as string) ?? "wire",
            title: (s.title as string) ?? eventRow.canonical_title,
            raw_content: null,
            article_url: (s.article_url as string) ?? "#",
            image_url: null,
            published_at: (s.published_at as string) ?? null,
            category: eventRow.category ?? "world",
            region: eventRow.region,
            language: null,
            ingestion_metadata: {},
            created_at: eventRow.created_at,
          }) as NewsSignalRow
      );
    }
  }

  const { data: updates } = await supabase
    .from("coverage_updates")
    .select("*")
    .eq("event_id", eventRow.id)
    .order("published_at", { ascending: false })
    .limit(40);

  const { data: article } = await supabase
    .from("generated_articles")
    .select(ARTICLE_SELECT)
    .eq("event_id", eventRow.id)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const articleRow = article
    ? ({
        ...article,
        editorial_metadata: article.editorial_metadata ?? {},
      } as GeneratedArticleRow)
    : null;

  const updateRows = (updates ?? []) as CoverageUpdateRow[];

  const meta = eventRow.clustering_metadata as {
    cluster_confidence_report?: { avgSimilarity?: number };
  };
  const avgSimilarity =
    meta.cluster_confidence_report?.avgSimilarity ??
    Number(eventRow.cluster_confidence) ??
    0.7;

  const confidence = computeClusterConfidence({
    signals,
    avgSimilarity,
    mergeReasons: ["evolving_coverage_page"],
  });

  const timeline = buildCoverageTimeline({
    signals,
    updates: updateRows,
    editorialPublishedAt: articleRow?.published_at,
    editorialHeadline: articleRow?.headline,
  });

  const liveBlocks = buildLiveUpdateBlocks(updateRows, signals);

  return {
    event: eventRow,
    signals,
    updates: updateRows,
    article: articleRow,
    timeline,
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
