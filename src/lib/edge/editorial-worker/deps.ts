/**
 * Production wiring of the editorial worker's dependencies. Kept separate from handler.ts so the handler stays
 * unit-testable with fakes; this module is what the Edge bundle (and the local one-story harness) actually run.
 */

import { isAnyChatProviderConfigured } from "@/lib/ai/providers/chat";
import { isRedisConfigured, redisDel, redisEval } from "@/lib/infrastructure/cache/redis";
import { aiRoundTrip, governorProbe } from "@/lib/edge/editorial-worker/governor-probe";
import { drainBackground } from "@/lib/runtime/background";
import { acquireWorkerRunLease } from "@/lib/infrastructure/workers/run-guard";
import { recordCronRun } from "@/lib/observability/cron-monitor";
import { generateEditorialsFromEvents } from "@/lib/news/ai/generate-article";
import { evaluateEgressGovernor, recordRunEgress } from "@/lib/observability/egress-governor";
import { revalidateNewsroomCaches } from "@/lib/infrastructure/cache/isr";
import { purgeOncePerWindow } from "@/lib/infrastructure/cache/purge-gate";
import { createAdminServerClient } from "@/lib/supabase";
import type { WorkerDeps } from "@/lib/edge/editorial-worker/handler";

async function readSchedulerEnabled(): Promise<boolean | null> {
  try {
    const { data, error } = await createAdminServerClient()
      .from("scheduler_control" as never)
      .select("enabled")
      .eq("id", 1)
      .maybeSingle();
    if (error) return null; // table absent (089 not applied) or DB error -> unknown, treated as "not enabled"
    return (data as { enabled?: boolean } | null)?.enabled === true;
  } catch {
    return null;
  }
}

export function createProductionDeps(env: Record<string, string | undefined> = process.env): WorkerDeps {
  return {
    generate: (options) => generateEditorialsFromEvents(options),
    // Fail CLOSED: if the lease cannot be verified, the worker must not run (Vercel and Edge must never overlap).
    acquireLease: (key, ttlSec) => acquireWorkerRunLease(key, ttlSec, { failOpen: false }),
    isSchedulerEnabled: readSchedulerEnabled,
    isAnyProviderConfigured: isAnyChatProviderConfigured,
    isDurableQuotaConfigured: isRedisConfigured,
    verifyDurableQuota: async () => (await redisEval<number>("return 1", [], [])) === 1,
    probeQuotaAtomicity: async () => {
      const key = `jd:edge-quota-probe:${crypto.randomUUID()}`;
      const limit = 3;
      const parallel = 20;
      const script =
        "local c = redis.call('INCR', KEYS[1]); if c > tonumber(ARGV[1]) then redis.call('DECR', KEYS[1]); return 0 end; redis.call('EXPIRE', KEYS[1], 60); return 1";
      const results = await Promise.all(Array.from({ length: parallel }, () => redisEval<number>(script, [key], [limit])));
      await redisDel(key);
      if (results.some((r) => r === null)) return null;
      return { winners: results.filter((r) => Number(r) === 1).length, limit, parallel };
    },
    probeGovernor: (input) => governorProbe(input),
    probeAi: () => aiRoundTrip(),
    recordRun: (run) =>
      recordCronRun({
        job: "editorial-generate",
        ok: run.ok,
        degraded: run.degraded,
        startedAt: run.startedAt,
        durationMs: run.durationMs,
        requestId: run.runId,
        error: run.error,
        trigger: "supabase-edge",
        processed: run.processed,
        skipped: run.skipped,
        failed: run.failed,
        metadata: run.metadata,
      }),
    // Inert unless JD_EGRESS_GOVERNOR is set (off by default: no Redis traffic, no effect).
    evaluateEgress: () => evaluateEgressGovernor({ env }),
    recordEgress: () => recordRunEgress({ env }),
    drainBackground: (ms) => drainBackground(ms),
    // Publishing is what changes list pages: purge the site's caches (bounded, never throws -- see isr.edge.ts).
    // Debounced to one purge per PURGE_DEBOUNCE_SECONDS: every purge forces the next list/hub request to re-read its pool.
    revalidatePublished: async () => {
      await purgeOncePerWindow(
        (script, keys, args) => redisEval<number>(script, keys, args),
        () => revalidateNewsroomCaches({ publishedStories: 1 })
      );
    },
    env,
    newId: () => crypto.randomUUID(),
  };
}
