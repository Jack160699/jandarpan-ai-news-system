/**
 * Shared event + coverage data fetch — single query path for read models.
 * Used by live coverage pages and the Event View Model builder.
 */

import {
  createAdminServerClient,
  createAnonServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import type {
  CoverageUpdateRow,
  GeneratedArticleRow,
  NewsEventRow,
  NewsSignalRow,
} from "@/lib/types/newsroom";

export const EVENT_SELECT =
  "id,canonical_title,event_summary,region,category,urgency_score,source_count,signal_ids,clustering_metadata,coverage_slug,coverage_headline,cluster_confidence,is_live,coverage_status,created_at,updated_at";

export const ARTICLE_SELECT =
  "id,event_id,slug,headline,summary,article_body,hero_image_url,seo_title,seo_description,reading_time,language,tags,published_at,editorial_status,editorial_metadata,created_at";

export type EventCoverageBundle = {
  event: NewsEventRow;
  signals: NewsSignalRow[];
  updates: CoverageUpdateRow[];
  article: GeneratedArticleRow | null;
};

function signalsFromClusteringMetadata(
  event: NewsEventRow
): NewsSignalRow[] {
  const metaSources = (
    event.clustering_metadata as { sources?: Array<Record<string, unknown>> }
  )?.sources;
  if (!Array.isArray(metaSources)) return [];

  return metaSources.map(
    (s, i) =>
      ({
        id: (s.id as string) ?? `meta-${i}`,
        source: (s.source as string) ?? null,
        provider: (s.provider as string) ?? "wire",
        title: (s.title as string) ?? event.canonical_title,
        raw_content: null,
        article_url: (s.article_url as string) ?? "#",
        image_url: null,
        published_at: (s.published_at as string) ?? null,
        category: event.category ?? "world",
        region: event.region,
        language: null,
        ingestion_metadata: {},
        created_at: event.created_at,
      }) as NewsSignalRow
  );
}

async function fetchSignalsForEvent(
  event: NewsEventRow
): Promise<NewsSignalRow[]> {
  const signalIds = event.signal_ids ?? [];
  if (!signalIds.length) {
    return signalsFromClusteringMetadata(event);
  }

  const admin = createAdminServerClient();
  const { data: sigs } = await admin
    .from("news_signals")
    .select("*")
    .in("id", signalIds);

  const signals = (sigs ?? []) as NewsSignalRow[];
  if (signals.length) return signals;
  return signalsFromClusteringMetadata(event);
}

export async function fetchEventRowById(
  eventId: string
): Promise<NewsEventRow | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("news_events")
    .select(EVENT_SELECT)
    .eq("id", eventId)
    .maybeSingle();

  if (error || !data) return null;
  return data as NewsEventRow;
}

export async function fetchEventRowByCoverageSlug(
  slug: string,
  options?: { liveOnly?: boolean }
): Promise<NewsEventRow | null> {
  if (!isSupabaseConfigured()) return null;

  const decoded = decodeURIComponent(slug);
  const supabase = createAnonServerClient();

  let query = supabase
    .from("news_events")
    .select(EVENT_SELECT)
    .eq("coverage_slug", decoded);

  if (options?.liveOnly !== false) {
    query = query.eq("is_live", true);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;
  return data as NewsEventRow;
}

export async function fetchEventCoverageBundle(
  event: NewsEventRow
): Promise<EventCoverageBundle> {
  const supabase = createAnonServerClient();

  const [signals, updatesResult, articleResult] = await Promise.all([
    fetchSignalsForEvent(event),
    supabase
      .from("coverage_updates")
      .select("*")
      .eq("event_id", event.id)
      .order("published_at", { ascending: false })
      .limit(40),
    supabase
      .from("generated_articles")
      .select(ARTICLE_SELECT)
      .eq("event_id", event.id)
      .order("published_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const article = articleResult.data
    ? ({
        ...articleResult.data,
        editorial_metadata: articleResult.data.editorial_metadata ?? {},
      } as GeneratedArticleRow)
    : null;

  return {
    event,
    signals,
    updates: (updatesResult.data ?? []) as CoverageUpdateRow[],
    article,
  };
}

export async function fetchEventCoverageBundleById(
  eventId: string
): Promise<EventCoverageBundle | null> {
  const event = await fetchEventRowById(eventId);
  if (!event) return null;
  return fetchEventCoverageBundle(event);
}
