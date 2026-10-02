/**
 * cluster-worker spec: clusterRecentSignals.
 * Wraps EXISTING pipeline code only (no logic is reimplemented).
 */

import { clusterRecentSignals } from "@/lib/newsroom/events/cluster";
import type { WorkerSpec } from "@/lib/edge/worker-kit/kit";

const asInt = (v: unknown, fallback: number, min: number, max: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.floor(n))) : fallback;
};

export const CLUSTER_BATCH_LIMIT = 120;
export const DEFAULT_CLUSTER_LOOKBACK_HOURS = 72;

export type ClusterParams = { lookbackMinutes: number };

export const CLUSTER_SPEC: WorkerSpec<ClusterParams> = {
  job: "cluster",
  parse(body) {
    return { ok: true, params: { lookbackMinutes: asInt(body.lookback_minutes, 120, 15, 360) }, leaseKey: "edge-cluster", label: {} };
  },
  async run({ params }) {
    // lookbackMinutes is a RECENCY window, not a row limit (it used to be passed as `limit`). The signal window never
    // shrinks below the clusterer default (72 h) so slow-publishing sources are still clustered; the batch size is fixed.
    const result = await clusterRecentSignals(CLUSTER_BATCH_LIMIT, {
      lookbackHours: Math.max(DEFAULT_CLUSTER_LOOKBACK_HOURS, Math.ceil(params.lookbackMinutes / 60)),
    });
    return {
      ok: !result.skipped,
      degraded: Boolean(result.skipped),
      processed: result.eventsCreated + result.signalsProcessed + result.duplicatesMerged,
      details: {
        events_created: result.eventsCreated,
        signals_processed: result.signalsProcessed,
        duplicates_merged: result.duplicatesMerged,
        skipped: Boolean(result.skipped),
      },
    };
  },
};
