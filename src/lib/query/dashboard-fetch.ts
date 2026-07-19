import { apiClient } from "@/lib/api/api-client";
import type { EditorialDashboardSnapshot } from "@/lib/editorial-dashboard/types";
import { traceDashboard } from "@/lib/observability/dashboard-trace";
import { tracePerf } from "@/lib/observability/performance-monitor";
import { DASHBOARD_MIN_NETWORK_GAP_MS } from "@/lib/query/dashboard-poll-state";

type DashboardApiResponse = EditorialDashboardSnapshot & {
  ok?: boolean;
  error?: string;
};

export type DashboardFetchOptions = {
  /** Bypass throttle / join in-flight dedupe for manual recovery */
  force?: boolean;
  reason?: "initial" | "poll" | "manual";
};

let inflight: Promise<EditorialDashboardSnapshot> | null = null;
let lastNetworkAt = 0;
let lastSnapshot: EditorialDashboardSnapshot | null = null;

export function getLastDashboardSnapshot(): EditorialDashboardSnapshot | null {
  return lastSnapshot;
}

export async function fetchEditorialDashboard(
  options: DashboardFetchOptions = {}
): Promise<EditorialDashboardSnapshot> {
  const { force = false, reason = "initial" } = options;

  if (inflight && !force) {
    traceDashboard("DASHBOARD_SKIP_INFLIGHT", reason);
    return inflight;
  }

  const now = Date.now();
  if (
    !force &&
    lastSnapshot &&
    now - lastNetworkAt < DASHBOARD_MIN_NETWORK_GAP_MS
  ) {
    traceDashboard("DASHBOARD_CACHE_HIT", reason, {
      ageMs: now - lastNetworkAt,
    });
    return lastSnapshot;
  }

  if (reason === "poll") {
    traceDashboard("DASHBOARD_POLL", "interval_tick");
  }

  tracePerf("QUERY", "editorial_dashboard_fetch", { reason, force });
  traceDashboard("DASHBOARD_FETCH", reason);

  const run = async (): Promise<EditorialDashboardSnapshot> => {
    const result = await apiClient.get<DashboardApiResponse>(
      "/api/editorial/dashboard",
      { label: "editorial_dashboard", timeoutMs: 15_000 }
    );
    if (!result.ok) {
      throw new Error(result.timedOut ? "timeout" : result.error);
    }
    if (result.data.ok === false) {
      throw new Error(result.data.error ?? "dashboard_failed");
    }
    lastSnapshot = result.data;
    lastNetworkAt = Date.now();
    return result.data;
  };

  inflight = run().finally(() => {
    inflight = null;
  });

  return inflight;
}
