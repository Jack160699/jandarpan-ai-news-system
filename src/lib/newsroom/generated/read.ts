/**
 * Read published generated_articles (future homepage source)
 */

import { createAnonServerClient } from "@/lib/supabase";
import { isGeneratedArticlesHomepageEnabled } from "@/lib/newsroom/generated/publish";
import { logNewsroom } from "@/lib/newsroom/logger";
import type { GeneratedArticleRow } from "@/lib/types/newsroom";

const GENERATED_SELECT =
  "id,event_id,slug,headline,summary,article_body,hero_image_url,seo_title,seo_description,reading_time,language,tags,published_at,created_at";

export async function fetchGeneratedArticlePool(
  limit = 280
): Promise<GeneratedArticleRow[]> {
  if (!isGeneratedArticlesHomepageEnabled()) return [];

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

  logNewsroom("generated", "fetch_pool", { count: data?.length ?? 0 });
  return data ?? [];
}
