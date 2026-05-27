/**
 * Event clustering insights from news_events
 */

import type { EventClusterInsight } from "@/lib/intelligence/types";
import type { Json } from "@/types/supabase";
import { jsonObjectFrom } from "@/types/json";

type EventRow = {
  id: string;
  canonical_title: string;
  region: string | null;
  category: string | null;
  urgency_score: number;
  source_count: number;
  signal_ids: string[] | null;
  clustering_metadata: Json | null;
  created_at: string;
};

export function buildEventClusterInsights(events: EventRow[]): EventClusterInsight[] {
  return events.map((e) => {
    const meta = jsonObjectFrom(e.clustering_metadata);
    const mergeConfidence =
      typeof meta.merge_confidence === "number"
        ? meta.merge_confidence
        : typeof meta.avg_similarity === "number"
          ? meta.avg_similarity
          : Math.min(0.95, 0.5 + (e.signal_ids?.length ?? 0) * 0.08);

    return {
      eventId: e.id,
      canonicalTitle: e.canonical_title,
      signalCount: (e.signal_ids ?? []).length,
      sourceCount: e.source_count ?? 0,
      urgencyScore: Number(e.urgency_score) || 0,
      mergeConfidence: Math.round(mergeConfidence * 1000) / 1000,
      region: e.region,
      category: e.category,
      createdAt: e.created_at,
    };
  });
}
