/**
 * Queue drain checkpointing — persist progress across cron runs (Redis-backed)
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import type { WorkerId } from "@/lib/infrastructure/workers/types";

const CHECKPOINT_PREFIX = "ops:queue:checkpoint:v1:";

export type QueueCheckpoint = {
  worker: WorkerId;
  lastRunAt: string;
  recordsProcessed: number;
  recordsSkipped: number;
  remainingQueue: number;
  partial: boolean;
  durationMs: number;
  recordsPerSec: number;
  batchCount: number;
};

export async function saveQueueCheckpoint(
  checkpoint: QueueCheckpoint
): Promise<void> {
  await cacheSetJson(
    `${CHECKPOINT_PREFIX}${checkpoint.worker}`,
    checkpoint,
    INFRA_CONFIG.queueCheckpointTtlSec
  );
}

export async function loadQueueCheckpoint(
  worker: WorkerId
): Promise<QueueCheckpoint | null> {
  return cacheGetJson<QueueCheckpoint>(`${CHECKPOINT_PREFIX}${worker}`);
}
