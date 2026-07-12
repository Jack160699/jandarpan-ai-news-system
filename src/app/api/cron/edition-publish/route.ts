import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { publishScheduledForCurrentEdition } from "@/lib/newsroom/edition-scheduler";
import {
  finalizeCronRun,
  instrumentCronStart,
} from "@/lib/observability/cron-instrumentation";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  const { startedAt, requestId } = instrumentCronStart("edition-publish", request);
  const auth = await verifyCronRequest(request, { capability: "pipeline" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  const result = await publishScheduledForCurrentEdition(new Date());
  const durationMs = Date.now() - startedAt;

  await finalizeCronRun({
    job: "edition-publish",
    startedAt,
    requestId,
    ok: result.ok,
    degraded: Boolean(result.reason),
    entityCount: result.published,
    metadata: {
      attempted: result.attempted,
      slot: result.slot ?? null,
      reason: result.reason ?? null,
    },
    ...(result.ok ? {} : { error: result.errors[0] ?? "edition_publish_failed" }),
  });

  return NextResponse.json(
    {
      ok: result.ok,
      worker: "edition-publish",
      slot: result.slot ?? null,
      limit: result.limit,
      attempted: result.attempted,
      published: result.published,
      reason: result.reason ?? null,
      errors: result.errors.slice(0, 10),
      durationMs,
    },
    { headers: noStoreHeaders(), status: result.ok ? 200 : 500 }
  );
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
