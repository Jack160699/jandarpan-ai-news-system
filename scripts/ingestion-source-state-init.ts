/**
 * Initialize ingestion_source_state from existing rss_source_health / signal timestamps.
 * Dry-run by default. Pass --execute to write.
 *
 * Usage:
 *   npx tsx scripts/ingestion-source-state-init.ts
 *   npx tsx scripts/ingestion-source-state-init.ts --execute
 */

import {
  buildSourceKey,
  upsertIngestionSourceState,
  type IngestionHealthState,
} from "../src/lib/news/ingestion/source-state";
import { RSS_SOURCES } from "../src/lib/news/providers/rss-sources";
import { createAdminServerClient, isSupabaseConfigured } from "../src/lib/supabase";

type Proposal = {
  source_key: string;
  provider_family: string;
  health_state: IngestionHealthState;
  last_item_timestamp: string | null;
  retirement_reason: string | null;
  enabled: boolean;
  action: "upsert" | "retire" | "skip";
};

async function main() {
  const execute = process.argv.includes("--execute");
  if (!isSupabaseConfigured()) {
    console.error("Supabase not configured");
    process.exit(1);
  }

  const supabase = createAdminServerClient();
  const proposals: Proposal[] = [];

  const { data: healthRows } = await supabase.from("rss_source_health").select("*");
  const healthMap = new Map(
    (healthRows ?? []).map((r) => [String((r as { source_id: string }).source_id), r])
  );

  for (const source of RSS_SOURCES) {
    const h = healthMap.get(source.id) as
      | {
          consecutive_failures?: number;
          last_success?: string | null;
          last_failure?: string | null;
        }
      | undefined;
    const consecutive = h?.consecutive_failures ?? 0;
    if (consecutive >= 40) {
      proposals.push({
        source_key: buildSourceKey("rss", source.id),
        provider_family: "rss",
        health_state: "permanently_retired",
        last_item_timestamp: null,
        retirement_reason: `consecutive_failures=${consecutive}`,
        enabled: false,
        action: "retire",
      });
      continue;
    }

    // Conservative cursor: latest signal for this source name if available.
    const { data: latest } = await supabase
      .from("news_signals")
      .select("published_at, created_at")
      .eq("provider", "rss")
      .ilike("source", `%${source.name.slice(0, 24)}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ts =
      (latest as { published_at?: string | null; created_at?: string } | null)
        ?.published_at ??
      (latest as { created_at?: string } | null)?.created_at ??
      h?.last_success ??
      null;

    proposals.push({
      source_key: buildSourceKey("rss", source.id),
      provider_family: "rss",
      health_state: consecutive >= 3 ? "temporarily_disabled" : "healthy",
      last_item_timestamp: ts,
      retirement_reason: null,
      enabled: true,
      action: "upsert",
    });
  }

  // API families — start with null cursor (bounded overlap only); do not set to now.
  for (const family of ["gnews", "newsdata"] as const) {
    proposals.push({
      source_key: buildSourceKey(family, "api"),
      provider_family: family,
      health_state: "unknown",
      last_item_timestamp: null,
      retirement_reason: null,
      enabled: true,
      action: "upsert",
    });
  }

  console.log(JSON.stringify({ dryRun: !execute, count: proposals.length, proposals }, null, 2));

  if (!execute) {
    console.log("Dry-run only. Re-run with --execute to persist.");
    return;
  }

  let wrote = 0;
  for (const p of proposals) {
    await upsertIngestionSourceState({
      source_key: p.source_key,
      provider_family: p.provider_family,
      enabled: p.enabled,
      health_state: p.health_state,
      last_item_timestamp: p.last_item_timestamp,
      retirement_reason: p.retirement_reason,
    });
    wrote += 1;
  }
  console.log(`Wrote ${wrote} source-state rows.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
