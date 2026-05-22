/**
 * RSS source health — skip dead feeds, track success/failure in Supabase
 */

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  RSS_DISABLE_HOURS,
  RSS_MAX_CONSECUTIVE_FAILURES,
  type RSSSource,
} from "@/lib/news/providers/rss-sources";

export type SourceHealthRecord = {
  source_id: string;
  name: string;
  last_success: string | null;
  last_failure: string | null;
  failure_count: number;
  consecutive_failures: number;
  disabled_until: string | null;
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
      map.set(row.source_id, row as SourceHealthRecord);
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
  if (!record?.disabled_until) return false;

  const until = new Date(record.disabled_until).getTime();
  if (Date.now() < until) {
    console.log(
      `[rss-health] Skipping ${source.id} (disabled until ${record.disabled_until})`
    );
    return true;
  }
  return false;
}

export async function recordSourceSuccess(
  source: RSSSource,
  health: Map<string, SourceHealthRecord>
): Promise<void> {
  const now = new Date().toISOString();
  const record: SourceHealthRecord = {
    source_id: source.id,
    name: source.name,
    last_success: now,
    last_failure: health.get(source.id)?.last_failure ?? null,
    failure_count: health.get(source.id)?.failure_count ?? 0,
    consecutive_failures: 0,
    disabled_until: null,
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

  let disabled_until: string | null = null;
  if (consecutive >= RSS_MAX_CONSECUTIVE_FAILURES) {
    const until = new Date();
    until.setHours(until.getHours() + RSS_DISABLE_HOURS);
    disabled_until = until.toISOString();
    console.warn(
      `[rss-health] Disabling ${source.id} for ${RSS_DISABLE_HOURS}h after ${consecutive} failures: ${errorMessage}`
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
  };

  health.set(source.id, record);
  await persistHealth(record);

  if (isSupabaseConfigured()) {
    try {
      const supabase = createAdminClient();
      await supabase.from("ingestion_failures").insert({
        title: source.name,
        article_url: source.url,
        provider: "rss",
        reason: `feed_failure: ${errorMessage.slice(0, 200)}`,
        payload: { source_id: source.id, consecutive },
      });
    } catch {
      /* non-fatal */
    }
  }
}

async function persistHealth(record: SourceHealthRecord): Promise<void> {
  memoryHealth.set(record.source_id, record);

  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createAdminClient();
    await supabase.from("rss_source_health").upsert(
      {
        ...record,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "source_id" }
    );
  } catch (err) {
    console.warn("[rss-health] persist failed:", err);
  }
}
