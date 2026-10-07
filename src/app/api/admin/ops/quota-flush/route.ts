/**
 * POST /api/admin/ops/quota-flush
 *
 * Manually flushes all RPD and TPD Redis quota keys for every tracked
 * provider+model bucket. Use this after a UTC midnight-anchor bug leaves
 * stale exhausted keys that block editorial generation for up to 9 hours
 * past the provider's actual quota reset.
 *
 * Requires the admin-capability secret in a request HEADER (Authorization: Bearer or x-cron-secret), verified with the shared
 * timing-safe cron auth. A secret in the URL is not accepted: URLs end up in access logs and browser history.
 */

import { NextResponse } from "next/server";
import { flushDailyQuotaKeys } from "@/lib/ai/providers/quota";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  const auth = await verifyCronRequest(request, { capability: "admin" });
  if (!auth.authorized) return cronAuthFailureResponse(auth);

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
