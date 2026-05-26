/**
 * Ingestion failure alerts — threshold-based ops notifications
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { trackOpsError } from "@/lib/observability/errors";
import { opsLogger } from "@/lib/observability/logger";

const ALERT_STATE_KEY = "ops:alerts:ingestion:v1";
const ALERT_COOLDOWN_SEC = 900;

type IngestionAlertState = {
  consecutiveFailures: number;
  lastAlertAt: string | null;
  lastStatus: string | null;
};

export type IngestionRunAlertInput = {
  status: string;
  inserted: number;
  totalFetched: number;
  errors?: string[];
  requestId?: string;
};

export async function evaluateIngestionAlert(
  input: IngestionRunAlertInput
): Promise<{ alerted: boolean; reason?: string }> {
  const state =
    (await cacheGetJson<IngestionAlertState>(ALERT_STATE_KEY)) ?? {
      consecutiveFailures: 0,
      lastAlertAt: null,
      lastStatus: null,
    };

  const failed =
    input.status === "error" ||
    input.status === "failed" ||
    (input.totalFetched > 0 && input.inserted === 0 && input.status !== "empty");

  if (failed) {
    state.consecutiveFailures += 1;
  } else {
    state.consecutiveFailures = 0;
  }
  state.lastStatus = input.status;

  const threshold = Number(process.env.INGEST_ALERT_FAILURE_THRESHOLD ?? 2);
  const shouldAlert = state.consecutiveFailures >= threshold;

  if (shouldAlert) {
    const lastAlert = state.lastAlertAt
      ? new Date(state.lastAlertAt).getTime()
      : 0;
    const cooledDown = Date.now() - lastAlert > ALERT_COOLDOWN_SEC * 1000;

    if (cooledDown) {
      state.lastAlertAt = new Date().toISOString();
      const reason = `ingestion_failures_${state.consecutiveFailures}`;

      await trackOpsError({
        source: "ingestion_alert",
        message: `Ingestion pipeline degraded: ${input.status} (${state.consecutiveFailures} consecutive)`,
        severity: state.consecutiveFailures >= 4 ? "critical" : "high",
        requestId: input.requestId,
        metadata: {
          inserted: input.inserted,
          totalFetched: input.totalFetched,
          errors: input.errors?.slice(0, 5),
        },
      });

      opsLogger.warn("ingestion_failure_alert", {
        reason,
        consecutiveFailures: state.consecutiveFailures,
        status: input.status,
      });

      await cacheSetJson(ALERT_STATE_KEY, state, ALERT_COOLDOWN_SEC * 4);
      return { alerted: true, reason };
    }
  }

  await cacheSetJson(ALERT_STATE_KEY, state, ALERT_COOLDOWN_SEC * 4);
  return { alerted: false };
}
