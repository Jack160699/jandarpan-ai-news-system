/**
 * Read published generated_articles — homepage + story source of truth
 */

import { createAnonServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { logNewsroom } from "@/lib/newsroom/logger";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const GENERATED_SELECT =
  "id,event_id,slug,headline,summary,article_body,hero_image_url,seo_title,seo_description,reading_time,language,tags,published_at,editorial_status,homepage_pin,pinned_at,editorial_metadata,created_at";

export async function fetchGeneratedArticlePool(
  limit = 280
): Promise<GeneratedArticleRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createAnonServerClient();
  const { data, error } = await supabase
    .from("generated_articles")
    .select(GENERATED_SELECT)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    logNewsroom("generated", "fetch_pool_failed", { error: error.message });
    return [];
  }

  const rows = (data ?? []).map((row) => ({
    ...row,
    editorial_metadata: row.editorial_metadata ?? {},
  }));

  const publicRows = rows.filter((row) => {
    const status = row.editorial_status ?? "approved";
    if (status === "rejected" || status === "pending") return false;
    return Boolean(row.published_at);
  });

  logNewsroom("generated", "fetch_pool", {
    count: publicRows.length,
    total: rows.length,
  });
  return publicRows;
}

export async function getGeneratedArticleBySlug(
  slug: string
): Promise<GeneratedArticleRow | null> {
  if (!isSupabaseConfigured()) return null;

  const decoded = decodeURIComponent(slug);
  const supabase = createAnonServerClient();

  const { data, error } = await supabase
    .from("generated_articles")
    .select(GENERATED_SELECT)
    .eq("slug", decoded)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    editorial_metadata: data.editorial_metadata ?? {},
  };
}

export async function getGeneratedArticleSlugs(
  limit = 200
): Promise<string[]> {
  const pool = await fetchGeneratedArticlePool(limit);
  return pool.map((r) => r.slug).filter(Boolean);
}
