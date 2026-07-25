/**
 * Lightweight published articles sharing an event_id.
 * Used for continuing-coverage timelines — no article_body payloads.
 */

import { createAnonServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { PUBLIC_EDITORIAL_STATUSES } from "@/lib/newsroom/publish-state";
import { logNewsroom } from "@/lib/newsroom/logger";
import type { EditorialMetadata } from "@/lib/types/newsroom";
import type { RegionalGeoMetadata } from "@/lib/regional/geo-tagging";

/** Cap cluster payload size — timeline never needs full event history in one shot. */
export const EVENT_CLUSTER_ARTICLE_LIMIT = 24;

export const EVENT_CLUSTER_ARTICLE_SELECT =
  "id,event_id,slug,headline,summary,published_at,editorial_status,workflow_status,editorial_metadata,geo_metadata,tags,language,created_at";

export type EventClusterArticle = {
  id: string;
  event_id: string;
  slug: string;
  headline: string;
  summary: string | null;
  published_at: string;
  editorial_metadata: EditorialMetadata;
  geo_metadata?: RegionalGeoMetadata | Record<string, unknown> | null;
  tags: string[];
  language: string | null;
  created_at: string;
};

function mapRow(row: Record<string, unknown>): EventClusterArticle | null {
  const id = typeof row.id === "string" ? row.id : null;
  const eventId = typeof row.event_id === "string" ? row.event_id : null;
  const slug = typeof row.slug === "string" ? row.slug.trim() : "";
  const headline = typeof row.headline === "string" ? row.headline.trim() : "";
  const publishedAt =
    typeof row.published_at === "string" ? row.published_at : null;

  if (!id || !eventId || !slug || !headline || !publishedAt) return null;

  return {
    id,
    event_id: eventId,
    slug,
    headline,
    summary: typeof row.summary === "string" ? row.summary : null,
    published_at: publishedAt,
    editorial_metadata:
      (row.editorial_metadata as EditorialMetadata | null | undefined) ?? {},
    geo_metadata: (row.geo_metadata as EventClusterArticle["geo_metadata"]) ?? null,
    tags: Array.isArray(row.tags)
      ? row.tags.filter((t): t is string => typeof t === "string")
      : [],
    language: typeof row.language === "string" ? row.language : null,
    created_at:
      typeof row.created_at === "string" ? row.created_at : publishedAt,
  };
}

/**
 * Fetch published sibling stories for an event cluster.
 * Returns [] when eventId is missing / Supabase unavailable / query fails.
 */
export async function fetchEventClusterArticles(
  eventId: string | null | undefined
): Promise<EventClusterArticle[]> {
  const id = eventId?.trim();
  if (!id) {
    logNewsroom("continuing_coverage_missing_event_id", { reason: "no_event_id" });
    return [];
  }

  if (!isSupabaseConfigured()) {
    logNewsroom("continuing_coverage_missing_cluster", {
      eventId: id,
      reason: "supabase_unconfigured",
    });
    return [];
  }

  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("generated_articles")
    .select(EVENT_CLUSTER_ARTICLE_SELECT)
    .eq("event_id", id)
    .not("published_at", "is", null)
    .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES])
    .order("published_at", { ascending: true, nullsFirst: false })
    .limit(EVENT_CLUSTER_ARTICLE_LIMIT);

  if (error) {
    logNewsroom("continuing_coverage_missing_cluster", {
      eventId: id,
      reason: "query_error",
      message: error.message,
    });
    return [];
  }

  const rows = (data ?? [])
    .map((row) => mapRow(row as Record<string, unknown>))
    .filter((row): row is EventClusterArticle => row !== null);

  if (rows.length === 0) {
    logNewsroom("continuing_coverage_missing_cluster", {
      eventId: id,
      reason: "empty_cluster",
    });
  }

  return rows;
}
