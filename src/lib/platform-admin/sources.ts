import type { ArticleSourceRow } from "@/lib/newsroom-platform/db/types";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { bootstrapPlatformSources } from "./bootstrap";
import type { AdminSourceRecord } from "./types";

export async function listAdminSources(): Promise<AdminSourceRecord[] | null> {
  if (!isSupabaseConfigured()) return null;

  await bootstrapPlatformSources();

  const supabase = createAdminServerClient();
  const [{ data: sources, error }, { data: health }] = await Promise.all([
    supabase
      .from("platform_article_sources")
      .select("*")
      .order("reliability_score", { ascending: false }),
    supabase.from("rss_source_health").select("*"),
  ]);

  if (error) {
    console.error("[platform-admin] sources:", error.message);
    return null;
  }

  const healthMap = new Map(
    (health ?? []).map((h) => [h.source_id as string, h])
  );

  return ((sources ?? []) as ArticleSourceRow[]).map((row) => {
    const sid = row.source_id ?? null;
    const h = sid ? healthMap.get(sid) : null;
    const disabled =
      h?.disabled_until &&
      new Date(h.disabled_until as string).getTime() > Date.now();

    let healthStatus = row.health_status as string;
    if (disabled) healthStatus = "disabled";
    else if (h?.last_success) healthStatus = "healthy";
    else if ((h?.consecutive_failures as number) > 2) healthStatus = "degraded";

    return {
      id: row.id,
      sourceId: sid,
      name: row.name,
      url: row.url ?? null,
      category: row.category ?? null,
      language: row.language ?? null,
      region: row.region ?? null,
      tier: row.tier ?? null,
      enabled: row.enabled && !disabled,
      trustScore: Number(row.trust_score ?? 0.8),
      reliabilityScore: Number(row.reliability_score ?? 0.8),
      healthStatus,
      failureCount: (h?.failure_count as number) ?? row.failure_count ?? 0,
      consecutiveFailures:
        (h?.consecutive_failures as number) ?? row.consecutive_failures ?? 0,
      lastSuccessAt: (h?.last_success as string) ?? row.last_success_at ?? null,
      articlesFetched24h: row.articles_fetched_24h ?? 0,
      createdAt: row.created_at as string,
      updatedAt: (row.updated_at ?? row.created_at) as string,
    };
  });
}

export async function patchAdminSource(
  id: string,
  patch: Partial<{ enabled: boolean; trustScore: number; reliabilityScore: number }>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  if (patch.trustScore !== undefined) update.trust_score = patch.trustScore;
  if (patch.reliabilityScore !== undefined) update.reliability_score = patch.reliabilityScore;

  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("platform_article_sources")
    .update(update as never)
    .eq("id", id);

  if (error) {
    console.error("[platform-admin] patch source:", error.message);
    return false;
  }
  return true;
}
