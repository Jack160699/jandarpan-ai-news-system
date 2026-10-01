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

export type ClusterParams = { lookbackMinutes: number };

export const CLUSTER_SPEC: WorkerSpec<ClusterParams> = {
  job: "cluster",
  parse(body) {
    return { ok: true, params: { lookbackMinutes: asInt(body.lookback_minutes, 120, 15, 360) }, leaseKey: "edge-cluster", label: {} };
  },
  async run({ params }) {
    const result = await clusterRecentSignals(params.lookbackMinutes);
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
