/**
 * Safe operational "run now" controls.
 *
 * Every manual operation:
 *  - requires admin authorization (enforced by the API route via requireAdminPermission)
 *  - writes an audit row (admin_manual_runs) with actor, role, action and outcome
 *  - is rate limited per action (rejects with 429 + Retry-After)
 *  - returns a run id
 *  - cannot overlap itself: a DB lease per action (acquire_run_lease) blocks a second
 *    concurrent run, and the target worker route holds its own lease against the scheduler
 */

import { createAdminServerClient } from "@/lib/supabase";
import { getActiveCronSecret } from "@/lib/infrastructure/auth/cron-auth";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import { generateVoiceSamples } from "@/lib/voice/samples";

import { RUN_ACTION_IDS, RUN_ACTION_META, isRunActionId, type RunActionId } from "@/lib/admin-ops/run-actions-meta";

export { RUN_ACTION_IDS, isRunActionId };
export type { RunActionId };

type ActionDef = {
  kind: "http" | "rpc" | "local" | "voice";
  path?: string;
  method?: "GET" | "POST";
  rpc?: string;
  /** Minimum seconds between two runs of this action (rate limit). */
  minIntervalSec: number;
  /** Lease TTL in seconds (safety net if a run crashes without releasing). */
  leaseTtlSec: number;
  timeoutMs: number;
};

export const RUN_ACTIONS: Record<RunActionId, ActionDef> = {
  ingest: {
    kind: "http",
    path: "/api/fetch-news",
    method: "POST",
    minIntervalSec: 120,
    leaseTtlSec: 600,
    timeoutMs: 295_000,
  },
  editorial: {
    kind: "http",
    path: "/api/cron/editorial-generate",
    method: "POST",
    minIntervalSec: 90,
    leaseTtlSec: 600,
    timeoutMs: 295_000,
  },
  retry_failed: {
    kind: "rpc",
    rpc: "admin_retry_failed_queue",
    minIntervalSec: 60,
    leaseTtlSec: 120,
    timeoutMs: 30_000,
  },
  reprocess_stale: {
    kind: "rpc",
    rpc: "admin_reprocess_stale_queue",
    minIntervalSec: 60,
    leaseTtlSec: 300,
    timeoutMs: 60_000,
  },
  refresh_rankings: {
    kind: "local",
    minIntervalSec: 30,
    leaseTtlSec: 60,
    timeoutMs: 15_000,
  },
  refresh_analytics: {
    kind: "http",
    path: "/api/cron/jobs",
    method: "POST",
    minIntervalSec: 120,
    leaseTtlSec: 600,
    timeoutMs: 295_000,
  },
  voice_test: {
    kind: "voice",
    minIntervalSec: 300,
    leaseTtlSec: 600,
    timeoutMs: 280_000,
  },
};

/** Pure rate-limit decision. */
export function rateLimitRetryAfterSec(
  lastRunAt: string | null,
  minIntervalSec: number,
  now = Date.now()
): number {
  if (!lastRunAt) return 0;
  const elapsed = (now - new Date(lastRunAt).getTime()) / 1000;
  return elapsed >= minIntervalSec ? 0 : Math.ceil(minIntervalSec - elapsed);
}

export type ManualRunActor = { userId: string; email: string | null; role: string };

export type StartResult =
  | { ok: true; runId: string; action: RunActionId; execute: () => Promise<void> }
  | { ok: false; status: 409 | 429 | 500; error: string; retryAfterSec?: number; runId?: string };

async function audit(
  runId: string,
  patch: { status: string; detail?: Record<string, unknown>; finished?: boolean }
): Promise<void> {
  try {
    await createAdminServerClient()
      .from("admin_manual_runs" as never)
      .update({
        status: patch.status,
        detail: patch.detail ?? null,
        ...(patch.finished ? { finished_at: new Date().toISOString() } : {}),
      } as never)
      .eq("id", runId);
  } catch {
    /* audit is best-effort after the row exists */
  }
}

export async function startManualRun(
  action: RunActionId,
  actor: ManualRunActor,
  origin: string
): Promise<StartResult> {
  const def = RUN_ACTIONS[action];
  const supabase = createAdminServerClient();

  // Rate limit: most recent run of this action that actually started.
  const { data: last } = await supabase
    .from("admin_manual_runs" as never)
    .select("created_at")
    .eq("action", action)
    .in("status", ["started", "ok", "failed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const retryAfter = rateLimitRetryAfterSec((last as { created_at?: string } | null)?.created_at ?? null, def.minIntervalSec);
  if (retryAfter > 0) {
    await supabase.from("admin_manual_runs" as never).insert({
      action,
      requested_by: actor.userId,
      requested_email: actor.email,
      role: actor.role,
      status: "rejected_rate_limit",
      detail: { retryAfterSec: retryAfter },
    } as never);
    return { ok: false, status: 429, error: "rate_limited", retryAfterSec: retryAfter };
  }

  // Overlap protection.
  const owner = `manual:${actor.userId}:${crypto.randomUUID()}`;
  const leaseKey = `manual:${action}`;
  const { data: got, error: leaseError } = await supabase.rpc("acquire_run_lease" as never, {
    p_key: leaseKey,
    p_owner: owner,
    p_ttl_seconds: def.leaseTtlSec,
  } as never);
  if (leaseError) return { ok: false, status: 500, error: `lease_unavailable: ${leaseError.message}` };
  if (got !== true) {
    await supabase.from("admin_manual_runs" as never).insert({
      action,
      requested_by: actor.userId,
      requested_email: actor.email,
      role: actor.role,
      status: "rejected_overlap",
    } as never);
    return { ok: false, status: 409, error: "already_running" };
  }

  const { data: row, error: insertError } = await supabase
    .from("admin_manual_runs" as never)
    .insert({
      action,
      requested_by: actor.userId,
      requested_email: actor.email,
      role: actor.role,
      status: "started",
    } as never)
    .select("id")
    .single();
  if (insertError || !row) {
    await supabase.rpc("release_run_lease" as never, { p_key: leaseKey, p_owner: owner } as never);
    return { ok: false, status: 500, error: "audit_insert_failed" };
  }
  const runId = (row as { id: string }).id;

  const execute = async () => {
    try {
      let detail: Record<string, unknown> = {};
      if (def.kind === "rpc") {
        const { data, error } = await supabase.rpc(def.rpc as never, {} as never);
        if (error) throw new Error(error.message);
        detail = (data as Record<string, unknown>) ?? {};
      } else if (def.kind === "voice") {
        const samples = await generateVoiceSamples(runId);
        detail = { samples };
        if (samples.every((s) => !s.ok)) throw Object.assign(new Error("all_voice_samples_failed"), { detail });
      } else if (def.kind === "local") {
        await revalidateNewsroomCaches({ publishedStories: 1 });
        detail = { revalidated: ["homepage", "latest", "district", "stories"] };
      } else {
        const { secret } = getActiveCronSecret();
        if (!secret) throw new Error("cron_secret_not_configured");
        const res = await fetch(`${origin}${def.path}`, {
          method: def.method ?? "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "x-jd-manual-run": runId,
            "content-type": "application/json",
          },
          body: def.method === "GET" ? undefined : "{}",
          signal: AbortSignal.timeout(def.timeoutMs),
        });
        const text = await res.text();
        let body: unknown = null;
        try {
          body = JSON.parse(text);
        } catch {
          body = text.slice(0, 300);
        }
        detail = { httpStatus: res.status, response: summarize(body) };
        if (!res.ok) throw Object.assign(new Error(`http_${res.status}`), { detail });
      }
      await audit(runId, { status: "ok", detail, finished: true });
    } catch (err) {
      const detail = (err as { detail?: Record<string, unknown> }).detail ?? {};
      await audit(runId, {
        status: "failed",
        detail: { ...detail, error: err instanceof Error ? err.message : String(err) },
        finished: true,
      });
    } finally {
      try {
        await supabase.rpc("release_run_lease" as never, { p_key: leaseKey, p_owner: owner } as never);
      } catch {
        /* lease expires on its TTL */
      }
    }
  };

  return { ok: true, runId, action, execute };
}

/** Keep audit detail small: top-level scalars and counts only. */
function summarize(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    if (["ok", "processed", "failed", "skipped", "published", "generated", "durationMs", "duration_ms", "reason", "degraded", "worker", "error"].includes(k)) {
      out[k] = v;
    }
  }
  return out;
}
