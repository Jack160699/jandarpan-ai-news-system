/**
 * Structured newsroom cycle logging — [NEWSROOM_CYCLE]
 */

export type NewsroomCycleStage =
  | "snapshot_before"
  | "ingest"
  | "clustering"
  | "ai_enrich"
  | "editorial_generate"
  | "editorial_images"
  | "homepage_refresh"
  | "snapshot_after"
  | "cycle_complete";

export type NewsroomCycleLogPayload = {
  stage: NewsroomCycleStage;
  durationMs?: number;
  ok?: boolean;
  error?: string;
  counts?: Record<string, number | string | null>;
  metadata?: Record<string, unknown>;
};

const cycleLogs: NewsroomCycleLogPayload[] = [];

export function resetNewsroomCycleLogs(): void {
  cycleLogs.length = 0;
}

export function getNewsroomCycleLogs(): NewsroomCycleLogPayload[] {
  return [...cycleLogs];
}

export function logNewsroomCycle(payload: NewsroomCycleLogPayload): void {
  cycleLogs.push(payload);
  console.log(
    "[NEWSROOM_CYCLE]",
    JSON.stringify({
      ts: new Date().toISOString(),
      ...payload,
    })
  );
}
