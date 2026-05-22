/**
 * Event clustering — groups duplicate signals into news_events
 * Stub: full AI clustering pipeline to be implemented
 */

import { createAdminServerClient } from "@/lib/supabase";
import { logNewsroom } from "@/lib/newsroom/logger";
import type { NewsEventInsert } from "@/lib/types/newsroom";

export type ClusterEventsResult = {
  eventsCreated: number;
  signalsProcessed: number;
  skipped: boolean;
};

/**
 * Placeholder clustering — creates single-signal events for recent unclustered signals.
 * Replace with embedding/title-similarity + LLM merge for production clustering.
 */
export async function clusterRecentSignals(
  limit = 50
): Promise<ClusterEventsResult> {
  if (process.env.NEWSROOM_CLUSTER_EVENTS !== "true") {
    logNewsroom("events", "clustering_disabled", {
      hint: "Set NEWSROOM_CLUSTER_EVENTS=true to enable",
    });
    return { eventsCreated: 0, signalsProcessed: 0, skipped: true };
  }

  const supabase = createAdminServerClient();
  const { data: signals, error } = await supabase
    .from("news_signals")
    .select("id, title, category, region, published_at, raw_content")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !signals?.length) {
    return { eventsCreated: 0, signalsProcessed: 0, skipped: true };
  }

  let eventsCreated = 0;

  for (const signal of signals) {
    const row: NewsEventInsert = {
      canonical_title: signal.title,
      event_summary: signal.raw_content?.slice(0, 400) ?? null,
      region: signal.region,
      category: signal.category,
      urgency_score: 50,
      source_count: 1,
      signal_ids: [signal.id],
    };

    const { error: insertError } = await supabase.from("news_events").insert(row);
    if (!insertError) eventsCreated++;
  }

  logNewsroom("events", "cluster_batch_complete", {
    eventsCreated,
    signalsProcessed: signals.length,
  });

  return {
    eventsCreated,
    signalsProcessed: signals.length,
    skipped: false,
  };
}
