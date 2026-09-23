/**
 * POST /api/admin/ops/quota-flush
 *
 * Manually flushes all RPD and TPD Redis quota keys for every tracked
 * provider+model bucket. Use this after a UTC midnight-anchor bug leaves
 * stale exhausted keys that block editorial generation for up to 9 hours
 * past the provider's actual quota reset.
 *
 * Requires a valid super-admin session or the CRON_API_SECRET header.
 */

import { NextResponse } from "next/server";
import { flushDailyQuotaKeys } from "@/lib/ai/providers/quota";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  // Accept x-cron-secret, Authorization: Bearer, or URL ?secret param
  const cronSecret = process.env.CRON_API_SECRET?.trim() ?? process.env.CRON_SECRET?.trim() ?? "";
  const xCronHeader = request.headers.get("x-cron-secret") ?? "";
  const authHeader = request.headers.get("authorization") ?? "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const url = new URL(request.url);
  const paramSecret = url.searchParams.get("secret") ?? "";

  const authorized =
    cronSecret &&
    (xCronHeader === cronSecret || bearerToken === cronSecret || paramSecret === cronSecret);

  if (!authorized) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const result = await flushDailyQuotaKeys();
    return NextResponse.json({
      ok: true,
      message: `Flushed ${result.flushed.length} daily quota keys from Redis. New requests will use fresh UTC-midnight-anchored counters.`,
      flushed: result.flushed,
      errors: result.errors,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
