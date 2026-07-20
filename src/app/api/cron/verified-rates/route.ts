import { NextResponse } from "next/server";
import { FUEL_CITY_SLUGS, RATE_CATEGORIES } from "@/lib/verified-rates";
import { runVerification } from "@/lib/verified-rates/verify";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { recordCronRun } from "@/lib/observability/cron-monitor";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Scheduled verification — persists observations; publishes snapshots only on consensus.
 * Auth: shared cron verifier (CRON_SECRET / QStash).
 */
export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

async function handle(request: Request) {
  const startedAt = Date.now();
  const auth = await verifyCronRequest(request, { capability: "ops" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  const results: Array<Record<string, unknown>> = [];

  for (const city of FUEL_CITY_SLUGS) {
    for (const category of ["petrol", "diesel"] as const) {
      const r = await runVerification({ category, citySlug: city });
      results.push({ category, city, ...r });
    }
  }

  for (const category of RATE_CATEGORIES.filter(
    (c) => c.startsWith("gold") || c.startsWith("silver")
  )) {
    const r = await runVerification({ category, citySlug: null });
    results.push({ category, city: null, ...r });
  }

  const ok = results.every(
    (r) => r.status === "accepted" || r.status === "insufficient_sources" || r.status === "blocked"
  );
  const durationMs = Date.now() - startedAt;
  await recordCronRun({
    job: "verified-rates",
    ok,
    startedAt: new Date(startedAt).toISOString(),
    durationMs,
    degraded: results.some((r) => r.status !== "accepted"),
  });

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    timezone: "Asia/Kolkata",
    results,
    durationMs,
  });
}
