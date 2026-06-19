/**
 * Standard cron auth HTTP responses — never use 404 for auth failures
 */

import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import {
  getActiveCronSecret,
  type CronAuthResult,
} from "@/lib/infrastructure/auth/cron-auth";

export function cronAuthFailureResponse(
  auth: CronAuthResult
): NextResponse {
  const cronSecret = getActiveCronSecret().secret;
  const headers = noStoreHeaders();

  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET not configured" },
      { status: 503, headers }
    );
  }

  const hasCredential = Boolean(
    auth.bearerToken || auth.cronHeader || auth.qstashVerified
  );

  if (!hasCredential) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers }
    );
  }

  return NextResponse.json(
    { ok: false, error: "Forbidden" },
    { status: 403, headers }
  );
}
