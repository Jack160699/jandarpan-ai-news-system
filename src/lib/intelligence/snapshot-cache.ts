/**
 * Precomputed intelligence snapshot — DB + Redis read path
 */

import { cacheGetJson, cacheSetJson } from "@/lib/infrastructure/cache";
import { WORKER_CACHE_KEYS } from "@/lib/infrastructure/cache/keys";
import type { NewsroomIntelligenceSnapshot } from "@/lib/intelligence/types";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

const REDIS_TTL_SECONDS = Number(process.env.INTELLIGENCE_CACHE_TTL_SEC) || 60;
const STALE_THRESHOLD_MS =
  Number(process.env.INTELLIGENCE_STALE_MS) || 5 * 60 * 1000;

export type CachedSnapshotMeta = {
  source: "redis" | "database" | "stale";
  builtAt: string;
  ageMs: number;
};

export async function getCachedIntelligenceSnapshot(
  tenantId?: string | null
): Promise<{
  snapshot: NewsroomIntelligenceSnapshot | null;
  meta: CachedSnapshotMeta | null;
}> {
  const key = tenantId ?? "global";

  const redisHit = await cacheGetJson<NewsroomIntelligenceSnapshot>(
    WORKER_CACHE_KEYS.intelligence(key)
  );
  if (redisHit?.fetchedAt) {
    const ageMs = Date.now() - new Date(redisHit.fetchedAt).getTime();
    return {
      snapshot: redisHit,
      meta: {
        source: "redis",
        builtAt: redisHit.fetchedAt,
        ageMs,
      },
    };
  }

  if (!isSupabaseConfigured()) {
    return { snapshot: null, meta: null };
  }

  const supabase = createAdminServerClient();
  let query = supabase
    .from("intelligence_snapshots")
    .select("snapshot, built_at")
    .order("built_at", { ascending: false })
    .limit(1);

  if (tenantId) {
    query = query.eq("tenant_id", tenantId);
  } else {
    query = query.is("tenant_id", null);
  }

  const { data } = await query.maybeSingle();
  if (!data?.snapshot) {
    return { snapshot: null, meta: null };
  }

  const snapshot = data.snapshot as NewsroomIntelligenceSnapshot;
  const builtAt = data.built_at as string;
  const ageMs = Date.now() - new Date(builtAt).getTime();
  const isStale = ageMs > STALE_THRESHOLD_MS;

  if (!isStale) {
    await cacheSetJson(
      WORKER_CACHE_KEYS.intelligence(key),
      snapshot,
      REDIS_TTL_SECONDS
    );
  }

  return {
    snapshot,
    meta: {
      source: isStale ? "stale" : "database",
      builtAt,
      ageMs,
    },
  };
}

const refreshInflight = new Map<string, number>();

export async function requestSnapshotRefresh(
  tenantId?: string | null
): Promise<void> {
  const key = tenantId ?? "global";
  const debounceMs = Number(process.env.INTELLIGENCE_REFRESH_DEBOUNCE_MS) || 120_000;
  const now = Date.now();
  const until = refreshInflight.get(key) ?? 0;
  if (until > now) return;
  refreshInflight.set(key, now + debounceMs);

  const { isDuplicateRequest } = await import("@/lib/infrastructure/cache/dedup");
  const duplicate = await isDuplicateRequest(
    `intel:refresh:${key}`,
    Math.floor(debounceMs / 1000)
  );
  if (duplicate) return;

  const { enqueueJob } = await import("@/lib/infrastructure/jobs/queue");
  await enqueueJob({
    jobType: "intelligence_snapshot",
    dedupeKey: `intelligence_snapshot:${key}`,
    tenantId,
    priority: 12,
  });
}

export function isSnapshotStale(meta: CachedSnapshotMeta | null): boolean {
  if (!meta) return true;
  return meta.ageMs > STALE_THRESHOLD_MS;
}
