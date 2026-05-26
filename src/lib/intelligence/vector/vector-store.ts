/**
 * Vector store — pgvector RPC with in-memory fallback
 */

import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  cosineSimilarity,
  contentHash,
  embedTexts,
  embeddingModel,
} from "@/lib/intelligence/vector/embeddings";

export type EntityType = "signal" | "article" | "event";

export type SimilarMatch = {
  entityType: EntityType;
  entityId: string;
  similarity: number;
  metadata: Record<string, unknown>;
};

export async function upsertEmbedding(input: {
  tenantId?: string | null;
  entityType: EntityType;
  entityId: string;
  text: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const [embedding] = await embedTexts([input.text]);
  if (!embedding) return false;

  const hash = contentHash(input.text);
  const supabase = createAdminServerClient();

  const { error } = await supabase.from("intelligence_embeddings").upsert(
    {
      tenant_id: input.tenantId ?? null,
      entity_type: input.entityType,
      entity_id: input.entityId,
      content_hash: hash,
      model: embeddingModel(),
      embedding: embedding as unknown as string,
      embedding_json: embedding,
      metadata: input.metadata ?? {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entity_type,entity_id" }
  );

  return !error;
}

export async function findSimilarByText(input: {
  text: string;
  tenantId?: string | null;
  entityType?: EntityType;
  limit?: number;
}): Promise<SimilarMatch[]> {
  const [queryEmb] = await embedTexts([input.text]);
  if (!queryEmb) return [];

  if (!isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();

  const { data, error } = await supabase.rpc("match_intelligence_embeddings", {
    query_embedding: queryEmb,
    match_count: input.limit ?? 12,
    filter_entity_type: input.entityType ?? null,
    filter_tenant_id: input.tenantId ?? null,
  });

  if (error || !data) {
    return inMemoryFallbackSearch(queryEmb, input);
  }

  return (data as Array<{
    entity_type: EntityType;
    entity_id: string;
    similarity: number;
    metadata: Record<string, unknown>;
  }>).map((row) => ({
    entityType: row.entity_type,
    entityId: row.entity_id,
    similarity: row.similarity,
    metadata: row.metadata ?? {},
  }));
}

async function inMemoryFallbackSearch(
  queryEmb: number[] | null,
  input: {
    text: string;
    tenantId?: string | null;
    entityType?: EntityType;
    limit?: number;
  }
): Promise<SimilarMatch[]> {
  if (!queryEmb || !isSupabaseConfigured()) return [];

  const supabase = createAdminServerClient();
  let q = supabase
    .from("intelligence_embeddings")
    .select("entity_type, entity_id, embedding_json, metadata")
    .not("embedding_json", "is", null)
    .limit(200);

  if (input.tenantId) q = q.eq("tenant_id", input.tenantId);
  if (input.entityType) q = q.eq("entity_type", input.entityType);

  const { data } = await q;
  if (!data?.length) return [];

  const scored = data
    .map((row) => {
      const emb = row.embedding_json as number[];
      return {
        entityType: row.entity_type as EntityType,
        entityId: row.entity_id as string,
        similarity: cosineSimilarity(queryEmb, emb),
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
      };
    })
    .sort((a, b) => b.similarity - a.similarity);

  return scored.slice(0, input.limit ?? 12);
}

export async function batchEmbedSignals(
  signals: Array<{
    id: string;
    title: string;
    raw_content?: string | null;
    provider: string;
  }>,
  tenantId?: string | null
): Promise<number> {
  const texts = signals.map(
    (s) => `${s.title}\n${(s.raw_content ?? "").slice(0, 400)}`
  );
  const embeddings = await embedTexts(texts);
  let count = 0;

  for (let i = 0; i < signals.length; i++) {
    const emb = embeddings[i];
    if (!emb) continue;
    const ok = await upsertEmbedding({
      tenantId,
      entityType: "signal",
      entityId: signals[i].id,
      text: texts[i],
      metadata: { provider: signals[i].provider, title: signals[i].title },
    });
    if (ok) count += 1;
  }

  return count;
}
