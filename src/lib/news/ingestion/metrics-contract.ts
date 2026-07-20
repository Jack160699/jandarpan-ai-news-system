/**
 * Step 3 — canonical ingestion metrics contract.
 * Distinguishes raw receipt from expensive-processing waste.
 */

import type { EarlyDedupMetrics } from "@/lib/news/ingestion/early-dedup";

export type IngestionMetricsContract = {
  requestsAttempted: number;
  providerResponses: number;
  rawItemsReceived: number;
  parsed: number;
  normalized: number;
  earlyDuplicateProviderId: number;
  earlyDuplicateCanonicalUrl: number;
  earlyDuplicateKnownSignal: number;
  earlyDuplicateBatch: number;
  deeperContentDuplicate: number;
  rejectedInvalid: number;
  imageEnrichmentAttempted: number;
  imageEnrichmentSkipped: number;
  newlyPersistedSignals: number;
  existingRowsUpdated: number;
  legacyBridgeInserted: number;
  aiJobsQueued: number;
  fallbackProvidersUsed: number;
  completedProviders: string[];
  failedProviders: string[];
  skippedProviders: string[];
  runtimeDeadlineState: "ok" | "approaching" | "timed_out_safe";
  cursorWindowsApplied: number;
  incrementalFiltered: number;
  gnewsRequestsAfterQuota: number;
  deadRssRequestsSkipped: number;
};

export function emptyIngestionMetrics(): IngestionMetricsContract {
  return {
    requestsAttempted: 0,
    providerResponses: 0,
    rawItemsReceived: 0,
    parsed: 0,
    normalized: 0,
    earlyDuplicateProviderId: 0,
    earlyDuplicateCanonicalUrl: 0,
    earlyDuplicateKnownSignal: 0,
    earlyDuplicateBatch: 0,
    deeperContentDuplicate: 0,
    rejectedInvalid: 0,
    imageEnrichmentAttempted: 0,
    imageEnrichmentSkipped: 0,
    newlyPersistedSignals: 0,
    existingRowsUpdated: 0,
    legacyBridgeInserted: 0,
    aiJobsQueued: 0,
    fallbackProvidersUsed: 0,
    completedProviders: [],
    failedProviders: [],
    skippedProviders: [],
    runtimeDeadlineState: "ok",
    cursorWindowsApplied: 0,
    incrementalFiltered: 0,
    gnewsRequestsAfterQuota: 0,
    deadRssRequestsSkipped: 0,
  };
}

export function applyEarlyDedupToMetrics(
  metrics: IngestionMetricsContract,
  early: EarlyDedupMetrics
): IngestionMetricsContract {
  return {
    ...metrics,
    earlyDuplicateProviderId:
      metrics.earlyDuplicateProviderId + early.earlyDuplicateProviderId,
    earlyDuplicateCanonicalUrl:
      metrics.earlyDuplicateCanonicalUrl + early.earlyDuplicateCanonicalUrl,
    earlyDuplicateKnownSignal:
      metrics.earlyDuplicateKnownSignal + early.earlyDuplicateKnownSignal,
    earlyDuplicateBatch: metrics.earlyDuplicateBatch + early.earlyDuplicateBatch,
    imageEnrichmentSkipped:
      metrics.imageEnrichmentSkipped +
      early.earlyDuplicateKnownSignal +
      early.earlyDuplicateBatch +
      early.earlyDuplicateCanonicalUrl +
      early.earlyDuplicateProviderId,
  };
}

export function fetchedToNewRatio(metrics: IngestionMetricsContract): number | null {
  if (metrics.newlyPersistedSignals <= 0) {
    return metrics.rawItemsReceived > 0 ? null : 0;
  }
  return (
    Math.round(
      (metrics.rawItemsReceived / metrics.newlyPersistedSignals) * 10
    ) / 10
  );
}

export function avoidableProcessingDuplicatePct(
  metrics: IngestionMetricsContract
): number | null {
  const early =
    metrics.earlyDuplicateKnownSignal +
    metrics.earlyDuplicateBatch +
    metrics.earlyDuplicateCanonicalUrl +
    metrics.earlyDuplicateProviderId;
  if (metrics.rawItemsReceived <= 0) return null;
  return Math.round((early / metrics.rawItemsReceived) * 1000) / 10;
}
