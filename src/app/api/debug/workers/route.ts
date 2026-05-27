import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { getAiProviderHealthSummary } from "@/lib/ai/providers";
import { getQueueStats, getWorkerHealth } from "@/lib/infrastructure/jobs/monitor";
import { listWorkers } from "@/lib/infrastructure/cron/orchestrator";
import { resolveCronWorkerId } from "@/lib/infrastructure/cron/worker-aliases";
import { runQueueWorker } from "@/lib/infrastructure/workers/registry";
import type { WorkerId } from "@/lib/infrastructure/workers/types";
import { createExecutionDeadline } from "@/lib/serverless/deadline";
import { INFRA_CONFIG } from "@/lib/infrastructure/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  const auth = verifyCronRequest(request);
  if (!auth.authorized) return cronAuthFailureResponse(auth);

  const url = new URL(request.url);
  const run = url.searchParams.get("run");

  const started = Date.now();
  const [queue, health, aiProviders] = await Promise.all([
    getQueueStats(),
    getWorkerHealth(24),
    Promise.resolve(getAiProviderHealthSummary()),
  ]);

  let invoked: unknown = null;
  if (run) {
    const workerId = resolveCronWorkerId(run);
    if (!workerId) {
      return NextResponse.json(
        { ok: false, error: "invalid_worker", run },
        { status: 400, headers: noStoreHeaders() }
      );
    }
    const deadline = createExecutionDeadline(INFRA_CONFIG.ingestBudgetMs);
    invoked = await runQueueWorker(workerId as WorkerId, {
      deadline,
      requestUrl: request.url,
    });
  }

  return NextResponse.json(
    {
      ok: true,
      durationMs: Date.now() - started,
      workers: listWorkers(),
      queue,
      health,
      aiProviders,
      invoked,
      checkedAt: new Date().toISOString(),
      hint: "Optionally run a worker: /api/debug/workers?run=ingest (cron-secret protected)",
    },
    { headers: noStoreHeaders() }
  );
}

