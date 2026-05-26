/**
 * Sync RSS catalog into platform_article_sources (idempotent).
 */

import { RSS_SOURCES } from "@/lib/news/providers/rss-sources";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";

export async function bootstrapPlatformSources(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = createAdminServerClient();
  const rows = RSS_SOURCES.map((s) => ({
    source_id: s.id,
    name: s.name,
    url: s.url,
    category: s.category,
    language: s.language,
    region: s.region,
    tier: s.tier,
    enabled: true,
    trust_score: Math.min(1, s.priority / 100),
    reliability_score: Math.min(1, s.priority / 100),
    health_status: "unknown",
  }));

  const { error } = await supabase
    .from("platform_article_sources")
    .upsert(rows as never[], { onConflict: "source_id" });

  if (error) {
    console.error("[platform-admin] bootstrap sources:", error.message);
    return 0;
  }

  return rows.length;
}
