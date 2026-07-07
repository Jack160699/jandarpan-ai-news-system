import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { publishScheduledForCurrentEdition } from "@/lib/newsroom/edition-scheduler";
import { recordCronRun } from "@/lib/observability/cron-monitor";

export const runtime = "nodejs";
export const maxDuration = 60;

async function run(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request);
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  const result = await publishScheduledForCurrentEdition(new Date());
  const durationMs = Date.now() - startedAt;

  await recordCronRun({
    job: "edition-publish",
    ok: result.ok,
    startedAt: new Date(startedAt).toISOString(),
    durationMs,
    degraded: Boolean(result.reason),
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

