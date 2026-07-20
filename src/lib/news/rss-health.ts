/**
 * RSS source health — skip dead feeds, dashboard API data
 */

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  RSS_DISABLE_HOURS,
  RSS_MAX_CONSECUTIVE_FAILURES,
  RSS_PERMANENT_DISABLE_YEARS,
  RSS_PERMANENT_RETIRE_FAILURES,
  RSS_SOURCES,
  type RSSSource,
} from "@/lib/news/providers/rss-sources";
import {
  buildSourceKey,
  isSourceCurrentlyBlocked,
  loadIngestionSourceState,
  markSourcePermanentlyRetired,
} from "@/lib/news/ingestion/source-state";

export type SourceHealthRecord = {
  source_id: string;
  name: string;
  last_success: string | null;
  last_failure: string | null;
  failure_count: number;
  consecutive_failures: number;
  disabled_until: string | null;
  last_article_count?: number;
  avg_articles?: number;
};

export type RssHealthDashboardEntry = {
  source: string;
  name: string;
  healthy: boolean;
  failures: number;
  lastSuccess: string | null;
  avgArticles: number;
  disabledUntil: string | null;
  tier: string;
  url: string;
};

const memoryHealth = new Map<string, SourceHealthRecord>();

export async function loadSourceHealth(): Promise<Map<string, SourceHealthRecord>> {
  const map = new Map<string, SourceHealthRecord>();

  if (!isSupabaseConfigured()) {
    for (const [k, v] of memoryHealth) map.set(k, v);
    return map;
  }

  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("rss_source_health").select("*");

    for (const row of data ?? []) {
      const r = row as SourceHealthRecord & {
        last_article_count?: number;
        avg_articles?: number;
      };
      map.set(r.source_id, {
        ...r,
        last_article_count: r.last_article_count ?? 0,
        avg_articles: r.avg_articles ?? 0,
      });
    }
  } catch {
    for (const [k, v] of memoryHealth) map.set(k, v);
  }

  return map;
}

export function isSourceSkipped(
  source: RSSSource,
  health: Map<string, SourceHealthRecord>
): boolean {
  const record = health.get(source.id);
  if (record && record.consecutive_failures >= RSS_PERMANENT_RETIRE_FAILURES) {
    return true;
  }
  if (!record?.disabled_until) return false;

  const until = new Date(record.disabled_until).getTime();
  if (Date.now() < until) {
    return true;
  }
  return false;
}

/** Async check including ingestion_source_state permanent retirement / long disable. */
export async function isRssSourceBlocked(
  source: RSSSource,
  health: Map<string, SourceHealthRecord>
): Promise<{ skipped: boolean; reason: string | null }> {
  if (isSourceSkipped(source, health)) {
    const record = health.get(source.id);
    if (record && record.consecutive_failures >= RSS_PERMANENT_RETIRE_FAILURES) {
      return { skipped: true, reason: "permanently_retired" };
    }
    return { skipped: true, reason: "temporarily_disabled" };
  }

  const state = await loadIngestionSourceState(buildSourceKey("rss", source.id));
  const blocked = isSourceCurrentlyBlocked(state);
  if (blocked.blocked) {
    return { skipped: true, reason: blocked.reason };
  }
  return { skipped: false, reason: null };
}

export async function recordSourceSuccess(
  source: RSSSource,
  health: Map<string, SourceHealthRecord>,
  articleCount: number
): Promise<void> {
  const now = new Date().toISOString();
  const prev = health.get(source.id);
  const prevAvg = prev?.avg_articles ?? 0;
  const avg_articles =
    articleCount > 0
      ? Math.round(prevAvg * 0.6 + articleCount * 0.4)
      : prevAvg;

  const record: SourceHealthRecord = {
    source_id: source.id,
    name: source.name,
    last_success: now,
    last_failure: prev?.last_failure ?? null,
    failure_count: prev?.failure_count ?? 0,
    consecutive_failures: 0,
    disabled_until: null,
    last_article_count: articleCount,
    avg_articles,
  };

  health.set(source.id, record);
  await persistHealth(record);
}

export async function recordSourceFailure(
  source: RSSSource,
  health: Map<string, SourceHealthRecord>,
  errorMessage: string
): Promise<void> {
  const prev = health.get(source.id);
  const consecutive = (prev?.consecutive_failures ?? 0) + 1;
  const now = new Date().toISOString();

  const permanent =
    consecutive >= RSS_PERMANENT_RETIRE_FAILURES ||
    isPermanentFeedError(errorMessage);

  let disabled_until: string | null = null;
  if (permanent) {
    const until = new Date();
    until.setFullYear(until.getFullYear() + RSS_PERMANENT_DISABLE_YEARS);
    disabled_until = until.toISOString();
    console.warn(
      `[rss-health] Permanently retired ${source.id}: ${errorMessage}`
    );
    await markSourcePermanentlyRetired({
      sourceKey: buildSourceKey("rss", source.id),
      providerFamily: "rss",
      reason: errorMessage.slice(0, 240),
    });
  } else if (consecutive >= RSS_MAX_CONSECUTIVE_FAILURES) {
    const until = new Date();
    until.setHours(until.getHours() + RSS_DISABLE_HOURS);
    disabled_until = until.toISOString();
    console.warn(
      `[rss-health] Disabled ${source.id} (${RSS_DISABLE_HOURS}h): ${errorMessage}`
    );
  }

  const record: SourceHealthRecord = {
    source_id: source.id,
    name: source.name,
    last_success: prev?.last_success ?? null,
    last_failure: now,
    failure_count: (prev?.failure_count ?? 0) + 1,
    consecutive_failures: consecutive,
    disabled_until,
    last_article_count: 0,
    avg_articles: prev?.avg_articles ?? 0,
  };

  health.set(source.id, record);
  await persistHealth(record);
}

function isPermanentFeedError(message: string): boolean {
  return /\b404\b|\b410\b|not found|gone|nxdomain|getaddrinfo|ENOTFOUND/i.test(
    message
  );
}

async function syncPlatformSourceMetrics(
  sourceId: string,
  patch: { lastSuccessAt?: string; articlesDelta?: number }
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createAdminClient();
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (patch.lastSuccessAt) {
      update.last_success_at = patch.lastSuccessAt;
      update.health_status = "healthy";
    }

    if (patch.articlesDelta && patch.articlesDelta > 0) {
      const { data: row } = await supabase
        .from("platform_article_sources")
        .select("articles_fetched_24h")
        .eq("source_id", sourceId)
        .maybeSingle();

      const current =
        (row as { articles_fetched_24h?: number } | null)?.articles_fetched_24h ??
        0;
      update.articles_fetched_24h = current + patch.articlesDelta;
    }

    if (Object.keys(update).length > 1) {
      await supabase
        .from("platform_article_sources")
        .update(update as never)
        .eq("source_id", sourceId);
    }
  } catch (err) {
    console.warn("[rss-health] platform source sync failed:", err);
  }
}

async function persistHealth(record: SourceHealthRecord): Promise<void> {
  memoryHealth.set(record.source_id, record);

  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createAdminClient();
    await supabase.from("rss_source_health").upsert(
      {
        source_id: record.source_id,
        name: record.name,
        last_success: record.last_success,
        last_failure: record.last_failure,
        failure_count: record.failure_count,
        consecutive_failures: record.consecutive_failures,
        disabled_until: record.disabled_until,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_id" }
    );

    if (record.last_success) {
      await syncPlatformSourceMetrics(record.source_id, {
        lastSuccessAt: record.last_success,
        articlesDelta: record.last_article_count ?? 0,
      });
    }
  } catch (err) {
    console.warn("[rss-health] persist failed:", err);
  }
}

export async function getRssHealthDashboard(): Promise<RssHealthDashboardEntry[]> {
  const health = await loadSourceHealth();

  return RSS_SOURCES.map((source) => {
    const record = health.get(source.id);
    const disabled =
      record?.disabled_until &&
      new Date(record.disabled_until).getTime() > Date.now();

    return {
      source: source.id,
      name: source.name,
      healthy: Boolean(record?.last_success) && !disabled,
      failures: record?.failure_count ?? 0,
      lastSuccess: record?.last_success ?? null,
      avgArticles: record?.avg_articles ?? record?.last_article_count ?? 0,
      disabledUntil: record?.disabled_until ?? null,
      tier: source.tier,
      url: source.url,
    };
  });
}
