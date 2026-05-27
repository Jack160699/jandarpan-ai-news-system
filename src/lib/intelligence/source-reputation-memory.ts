/**
 * Persistent source reputation — rolling memory in Supabase
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { asJson } from "@/types/json";
import type { SourceReputationMemory } from "@/lib/intelligence/types";

export async function loadSourceReputationMemory(
  tenantId?: string | null
): Promise<SourceReputationMemory[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  let q = supabase
    .from("source_reputation_memory")
    .select("*")
    .order("reputation_score", { ascending: false })
    .limit(40);

  if (tenantId) q = q.eq("tenant_id", tenantId);

  const { data } = await q;
  return (data ?? []).map((row) => ({
    sourceKey: row.source_key,
    sourceName: row.source_name,
    reputationScore: Number(row.reputation_score),
    credibilityScore: Number(row.credibility_score),
    misinfoIncidents: row.misinfo_incidents,
    verifiedHits: row.verified_hits,
    totalSignals: row.total_signals,
    lastSeenAt: row.last_seen_at,
  }));
}

export async function updateSourceReputationMemory(input: {
  tenantId?: string | null;
  sourceKey: string;
  sourceName: string;
  trustDelta: number;
  misinfo?: boolean;
  verified?: boolean;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createAdminServerClient();

  const { data: existing } = await supabase
    .from("source_reputation_memory")
    .select("*")
    .eq("source_key", input.sourceKey)
    .eq("tenant_id", (input.tenantId ?? null) as unknown as string)
    .maybeSingle();

  const prevScore = existing ? Number(existing.reputation_score) : 0.5;
  const nextScore = Math.max(0, Math.min(1, prevScore + input.trustDelta));

  const history = Array.isArray(existing?.history)
    ? (existing.history as Array<Record<string, unknown>>)
    : [];

  history.unshift({
    at: new Date().toISOString(),
    delta: input.trustDelta,
    misinfo: input.misinfo ?? false,
    verified: input.verified ?? false,
  });

  await supabase.from("source_reputation_memory").upsert(
    {
      tenant_id: (input.tenantId ?? null) as unknown as string,
      source_key: input.sourceKey,
      source_name: input.sourceName,
      reputation_score: nextScore,
      credibility_score: nextScore,
      misinfo_incidents:
        (existing?.misinfo_incidents ?? 0) + (input.misinfo ? 1 : 0),
      verified_hits: (existing?.verified_hits ?? 0) + (input.verified ? 1 : 0),
      total_signals: (existing?.total_signals ?? 0) + 1,
      history: asJson(history.slice(0, 24)),
      last_seen_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,source_key" }
  );
}

export async function syncReputationFromIngestion(input: {
  tenantId?: string | null;
  signals: Array<{ provider: string; source: string | null; title: string }>;
}): Promise<void> {
  for (const s of input.signals.slice(0, 50)) {
    const key = `${s.provider}|${s.source ?? "unknown"}`;
    await updateSourceReputationMemory({
      tenantId: input.tenantId,
      sourceKey: key,
      sourceName: s.source ?? s.provider,
      trustDelta: 0.01,
    });
  }
}
