import { describe, expect, it } from "vitest";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";
import { GENERATION_LANE_TARGETS } from "@/lib/infrastructure/workers/editorial-generate-observability";
import { EDITORIAL_GENERATE_JOB_TIMEOUT_MS } from "@/lib/infrastructure/events/event-bus";

/**
 * Regression test for the editorial-generate lane's execution deadline.
 *
 * Production evidence (worker_job_runs, 2026-07-25/26): every editorial_generate
 * job that needed more than ~78s consistently failed with "job_timeout" at
 * 76.8s-78.4s, never anywhere near the job's own timeout_ms (90_000 then
 * 105_000ms). Root cause: createExecutionDeadline() applies
 * INFRA_CONFIG.ingestStopRatio and workerDeadlineReserveMs on top of the
 * budget it is given, so passing GENERATION_LANE_TARGETS.budgetMs (100_000)
 * straight through shrank the real working window to ~79s
 * (100_000 * 0.82 - 3_000) — well under the 105s job timeout, so the job
 * timeout config could never actually bind.
 */
describe("editorial-generate lane execution deadline", () => {
  it("gives the lane close to its intended 100s working budget, not a shrunken ~79s", () => {
    const inflatedInput = Math.ceil(
      (GENERATION_LANE_TARGETS.budgetMs + INFRA_CONFIG.workerDeadlineReserveMs) /
        INFRA_CONFIG.ingestStopRatio
    );
    const deadline = createExecutionDeadline(inflatedInput);
    const effectiveWorkingMs = deadline.remainingMs() - INFRA_CONFIG.workerDeadlineReserveMs;

    expect(effectiveWorkingMs).toBeGreaterThanOrEqual(
      GENERATION_LANE_TARGETS.budgetMs - 100
    );
  });

  it("no longer leaves EDITORIAL_GENERATE_JOB_TIMEOUT_MS unreachable", () => {
    const inflatedInput = Math.ceil(
      (GENERATION_LANE_TARGETS.budgetMs + INFRA_CONFIG.workerDeadlineReserveMs) /
        INFRA_CONFIG.ingestStopRatio
    );
    const deadline = createExecutionDeadline(inflatedInput);
    const effectiveWorkingMs = deadline.remainingMs() - INFRA_CONFIG.workerDeadlineReserveMs;

    expect(effectiveWorkingMs).toBeGreaterThan(79_000);
    expect(effectiveWorkingMs).toBeLessThanOrEqual(EDITORIAL_GENERATE_JOB_TIMEOUT_MS);
  });

  it("stays comfortably under the route's 120s maxDuration", () => {
    const inflatedInput = Math.ceil(
      (GENERATION_LANE_TARGETS.budgetMs + INFRA_CONFIG.workerDeadlineReserveMs) /
        INFRA_CONFIG.ingestStopRatio
    );
    const deadline = createExecutionDeadline(inflatedInput);
    expect(deadline.remainingMs()).toBeLessThan(110_000);
  });
});
