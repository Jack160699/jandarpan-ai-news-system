/**
 * Event clustering orchestration — delegates to AI clustering engine
 */

import {
  clusterSignalsIntoEvents,
  type ClusterSignalsResult,
} from "@/lib/news/ai/event-clustering";
import { logNewsroom } from "@/lib/newsroom/logger";

export type { ClusterSignalsResult };

/**
 * Cluster unprocessed news_signals into news_events.
 * Requires NEWSROOM_CLUSTER_EVENTS=true
 */
export async function clusterRecentSignals(
  limit = 120
): Promise<ClusterSignalsResult> {
  if (process.env.NEWSROOM_CLUSTER_EVENTS !== "true") {
    logNewsroom("events", "clustering_disabled", {
      hint: "Set NEWSROOM_CLUSTER_EVENTS=true to enable",
    });
    return {
      eventsCreated: 0,
      eventsUpdated: 0,
      signalsProcessed: 0,
      signalsClustered: 0,
      duplicatesMerged: 0,
      skipped: true,
      analytics: {
        signalsFetched: 0,
        unprocessedCount: 0,
        pairsCompared: 0,
        duplicatePairs: 0,
        clustersFormed: 0,
        singletonClusters: 0,
        multiSourceClusters: 0,
        avgClusterSize: 0,
        avgSimilarity: 0,
        method: "keyword_tfidf",
        sourceConfidenceAvg: 0,
      },
    };
  }

  return clusterSignalsIntoEvents({ limit });
}
