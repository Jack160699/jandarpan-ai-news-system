/**
 * GET/POST /api/cron/provider-quota-snapshot
 * Hourly read-only peek at free-tier AI provider quota state (rpm/tpm/rpd/tpd),
 * persisted to provider_quota_snapshots for the Daily Newsroom Audit Report.
 * Registered in vercel.json at "25 * * * *" (hourly :25 — avoids the :00
 * workers/health slot).
 */

import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/infrastructure/auth/cron-auth";
import { cronAuthFailureResponse } from "@/lib/infrastructure/auth/cron-response";
import { noStoreHeaders } from "@/lib/infrastructure/cache/edge";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { getTrackedQuotaBuckets, peekQuota, type QuotaScope } from "@/lib/ai/providers/quota";
import type { AiProviderId } from "@/lib/ai/providers/types";
import {
  finalizeCronRun,
  instrumentCronStart,
} from "@/lib/observability/cron-instrumentation";
import { pipelineWarn } from "@/lib/observability/production-log";

export const runtime = "nodejs";
export const maxDuration = 30;

const SCOPES: QuotaScope[] = ["rpm", "tpm", "rpd", "tpd"];

export async function GET(request: Request) {
  return handleProviderQuotaSnapshot(request);
}

export async function POST(request: Request) {
  return handleProviderQuotaSnapshot(request);
}

async function handleProviderQuotaSnapshot(request: Request) {
  const { startedAt, requestId } = instrumentCronStart("provider-quota-snapshot", request);
  const auth = await verifyCronRequest(request, { capability: "ops" });
  if (!auth.authorized) {
    return cronAuthFailureResponse(auth);
  }

  const buckets = getTrackedQuotaBuckets();

  const rows: Array<{
    provider: AiProviderId;
    model: string | null;
    scope: QuotaScope;
    window_start: string;
    quota_limit: number;
    quota_used: number;
    quota_remaining: number;
  }> = [];
  // Scopes that are genuinely unavailable (e.g. Gemini TPD) are never
  // inserted as a fabricated row — see peekQuota's `unavailable` flag.
  const unavailableScopes: Array<{ provider: string; model: string | null; scope: string }> = [];
  const errors: Array<{ provider: string; scope: string; reason: string }> = [];

  for (const { provider, model } of buckets) {
    for (const scope of SCOPES) {
      try {
        const snapshot = await peekQuota(provider, scope, model);
        if (snapshot.unavailable || snapshot.limit === null || snapshot.used === null || snapshot.remaining === null) {
          unavailableScopes.push({ provider, model, scope });
          continue;
        }
        rows.push({
          provider,
          model,
          scope,
          window_start: new Date(snapshot.windowStart).toISOString(),
          quota_limit: snapshot.limit,
          quota_used: snapshot.used,
          quota_remaining: snapshot.remaining,
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        errors.push({ provider: model ? `${provider}:${model}` : provider, scope, reason });
        pipelineWarn("[provider_quota_snapshot_peek_error]", { provider, model, scope, reason });
      }
    }
  }

  let inserted = 0;
  if (rows.length && isSupabaseConfigured()) {
    try {
      const supabase = createAdminServerClient();
      const { error } = await supabase
        .from("provider_quota_snapshots" as never)
        .insert(rows as never);
      if (error) throw new Error(error.message);
      inserted = rows.length;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      errors.push({ provider: "*", scope: "*", reason: `insert_failed: ${reason}` });
    }
  }

  const ok = errors.length === 0 && inserted === rows.length;

  await finalizeCronRun({
    job: "provider-quota-snapshot",
    startedAt,
    requestId,
    ok,
    degraded: errors.length > 0 && inserted > 0,
    entityCount: inserted,
    ...(errors.length ? { error: errors.map((e) => `${e.provider}:${e.scope}:${e.reason}`).join("; ") } : {}),
  });

  return NextResponse.json(
    {
      ok,
      inserted,
      attempted: buckets.length * SCOPES.length,
      unavailable: unavailableScopes,
      errors,
      duration_ms: Date.now() - startedAt,
    },
    { status: ok ? 200 : 207, headers: noStoreHeaders() }
  );
}
