/**
 * Persist editorial image generation attempt history
 */

import { createAdminServerClient } from "@/lib/supabase";
import type { Json } from "@/types/supabase";

export type GenerationAttemptRecord = {
  queueId?: string;
  generatedArticleId: string;
  attemptNumber: number;
  provider: string;
  model?: string;
  prompt: string;
  promptHash?: string;
  status: "started" | "completed" | "rejected" | "failed";
  qualityScore?: number;
  qualityFlags?: string[];
  heroImageUrl?: string;
  ogImageUrl?: string;
  visualHash?: string;
  latencyMs?: number;
  error?: string;
  metadata?: Record<string, unknown>;
};

export async function logGenerationAttempt(
  record: GenerationAttemptRecord
): Promise<string | null> {
  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("editorial_image_generations")
    .insert({
      queue_id: record.queueId ?? null,
      generated_article_id: record.generatedArticleId,
      attempt_number: record.attemptNumber,
      provider: record.provider,
      model: record.model ?? null,
      prompt: record.prompt.slice(0, 4000),
      prompt_hash: record.promptHash ?? null,
      status: record.status,
      quality_score: record.qualityScore ?? null,
      quality_flags: record.qualityFlags ?? null,
      hero_image_url: record.heroImageUrl ?? null,
      og_image_url: record.ogImageUrl ?? null,
      visual_hash: record.visualHash ?? null,
      latency_ms: record.latencyMs ?? null,
      error: record.error?.slice(0, 500) ?? null,
      metadata: (record.metadata ?? {}) as Json,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("[editorial-image-history] insert:", error.message);
    return null;
  }
  return data?.id ?? null;
}

export async function fetchGenerationHistory(
  articleId: string,
  limit = 20
): Promise<
  Array<{
    id: string;
    attempt_number: number;
    provider: string;
    model: string | null;
    prompt: string;
    status: string;
    quality_score: number | null;
    quality_flags: string[] | null;
    hero_image_url: string | null;
    latency_ms: number | null;
    error: string | null;
    created_at: string;
  }>
> {
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("editorial_image_generations")
    .select(
      "id, attempt_number, provider, model, prompt, status, quality_score, quality_flags, hero_image_url, latency_ms, error, created_at"
    )
    .eq("generated_article_id", articleId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function fetchRecentGenerationsForCompare(
  articleId: string
): Promise<
  Array<{
    id: string;
    hero_image_url: string | null;
    quality_score: number | null;
    prompt: string;
    status: string;
    created_at: string;
  }>
> {
  const supabase = createAdminServerClient();
  const { data } = await supabase
    .from("editorial_image_generations")
    .select("id, hero_image_url, quality_score, prompt, status, created_at")
    .eq("generated_article_id", articleId)
    .in("status", ["completed", "rejected"])
    .order("created_at", { ascending: false })
    .limit(10);

  return data ?? [];
}
