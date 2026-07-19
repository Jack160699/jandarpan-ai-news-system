/**
 * Phase 6 — bounded generated-pool summary for health / admin.
 * Never loads article bodies or large result sets.
 */

import { isStatementTimeoutError } from "@/lib/newsroom/generated/pool-limits";
import { PUBLIC_EDITORIAL_STATUSES } from "@/lib/newsroom/publish-state";
import { createAnonServerClient, isSupabaseConfigured } from "@/lib/supabase";

export type GeneratedPoolSummary = {
  ok: boolean;
  publishedCount: number | null;
  pendingCount: number | null;
  latestPublishedAt: string | null;
  hasPublished: boolean;
  durationMs: number;
  timedOut: boolean;
  fromCache: boolean;
  error?: string;
};

const CACHE_TTL_MS = 30_000;
const QUERY_TIMEOUT_MS = 900;

let cached: { at: number; value: GeneratedPoolSummary } | null = null;
let inflight: Promise<GeneratedPoolSummary> | null = null;

export function clearGeneratedPoolSummaryCache(): void {
  cached = null;
}

type BudgetOk<T> = { ok: true; value: T };
type BudgetFail = { ok: false; timedOut: boolean; message: string };

async function withBudget<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<BudgetOk<T> | BudgetFail> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const raced = await Promise.race([
      promise.then((v) => ({ kind: "value" as const, v })),
      new Promise<{ kind: "timeout" }>((resolve) => {
        timer = setTimeout(() => resolve({ kind: "timeout" }), timeoutMs);
      }),
    ]);
    if (raced.kind === "timeout") {
      return { ok: false, timedOut: true, message: `query_timeout_${timeoutMs}ms` };
    }
    return { ok: true, value: raced.v };
  } catch (err) {
    const message = err instanceof Error ? err.message : "query_failed";
    return {
      ok: false,
      timedOut: isStatementTimeoutError(message),
      message,
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function loadGeneratedPoolSummary(): Promise<GeneratedPoolSummary> {
  const started = Date.now();
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      publishedCount: null,
      pendingCount: null,
      latestPublishedAt: null,
      hasPublished: false,
      durationMs: 0,
      timedOut: false,
      fromCache: false,
      error: "not_configured",
    };
  }

  const supabase = createAnonServerClient();

  const latestRes = await withBudget(
    Promise.resolve(
      supabase
        .from("generated_articles")
        .select("published_at")
        .not("published_at", "is", null)
        .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES])
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle()
    ),
    QUERY_TIMEOUT_MS
  );

  if (!latestRes.ok) {
    return {
      ok: false,
      publishedCount: null,
      pendingCount: null,
      latestPublishedAt: null,
      hasPublished: false,
      durationMs: Date.now() - started,
      timedOut: latestRes.timedOut,
      fromCache: false,
      error: latestRes.message,
    };
  }

  if (latestRes.value.error) {
    const message = latestRes.value.error.message;
    return {
      ok: false,
      publishedCount: null,
      pendingCount: null,
      latestPublishedAt: null,
      hasPublished: false,
      durationMs: Date.now() - started,
      timedOut: isStatementTimeoutError(message),
      fromCache: false,
      error: message,
    };
  }

  const latestPublishedAt = latestRes.value.data?.published_at ?? null;
  const hasPublished = Boolean(latestPublishedAt);

  const publishedCountRes = await withBudget(
    Promise.resolve(
      supabase
        .from("generated_articles")
        .select("id", { count: "exact", head: true })
        .not("published_at", "is", null)
        .in("editorial_status", [...PUBLIC_EDITORIAL_STATUSES])
    ),
    QUERY_TIMEOUT_MS
  );

  const pendingCountRes = await withBudget(
    Promise.resolve(
      supabase
        .from("generated_articles")
        .select("id", { count: "exact", head: true })
        .eq("editorial_status", "pending")
    ),
    QUERY_TIMEOUT_MS
  );

  let publishedCount: number | null = null;
  let pendingCount: number | null = null;
  let timedOut = false;
  let error: string | undefined;

  if (publishedCountRes.ok) {
    if (publishedCountRes.value.error) {
      timedOut = isStatementTimeoutError(publishedCountRes.value.error.message);
      error = publishedCountRes.value.error.message;
    } else {
      publishedCount = publishedCountRes.value.count ?? null;
    }
  } else {
    timedOut = publishedCountRes.timedOut;
    error = publishedCountRes.message;
  }

  if (pendingCountRes.ok) {
    if (pendingCountRes.value.error) {
      timedOut =
        timedOut || isStatementTimeoutError(pendingCountRes.value.error.message);
    } else {
      pendingCount = pendingCountRes.value.count ?? null;
    }
  } else {
    timedOut = timedOut || pendingCountRes.timedOut;
  }

  return {
    ok: hasPublished || publishedCount != null,
    publishedCount,
    pendingCount,
    latestPublishedAt,
    hasPublished,
    durationMs: Date.now() - started,
    timedOut,
    fromCache: false,
    ...(error ? { error } : {}),
  };
}

/** Cached summary for health/admin — 30s TTL, single-flight. */
export async function getGeneratedPoolSummary(options?: {
  forceRefresh?: boolean;
}): Promise<GeneratedPoolSummary> {
  const now = Date.now();
  if (!options?.forceRefresh && cached && now - cached.at < CACHE_TTL_MS) {
    return { ...cached.value, fromCache: true };
  }

  if (inflight) return inflight;

  inflight = loadGeneratedPoolSummary()
    .then((value) => {
      if (!value.ok && value.timedOut && cached) {
        return { ...cached.value, fromCache: true, timedOut: true };
      }
      cached = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
