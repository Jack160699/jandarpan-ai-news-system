/**
 * AI-generated editorial articles → generated_articles (public layer)
 * Stub: full generation pipeline to be implemented
 */

import { createAdminServerClient } from "@/lib/supabase";
import { buildArticleSlug } from "@/lib/news/slug";
import { logNewsroom } from "@/lib/newsroom/logger";
import type { GeneratedArticleInsert } from "@/lib/types/newsroom";

export type GenerateArticlesResult = {
  published: number;
  skipped: boolean;
};

export function isGeneratedArticlesHomepageEnabled(): boolean {
  return process.env.USE_GENERATED_ARTICLES === "true";
}

/**
 * Placeholder: publish minimal generated articles from events without full LLM body.
 * Replace with OpenAI editorial generation for production.
 */
export async function publishGeneratedFromEvents(
  limit = 20
): Promise<GenerateArticlesResult> {
  if (process.env.NEWSROOM_GENERATE_ARTICLES !== "true") {
    logNewsroom("generated", "generation_disabled", {
      hint: "Set NEWSROOM_GENERATE_ARTICLES=true to enable",
    });
    return { published: 0, skipped: true };
  }

  const supabase = createAdminServerClient();
  const { data: events, error } = await supabase
    .from("news_events")
    .select("id, canonical_title, event_summary, category, region, signal_ids")
    .order("urgency_score", { ascending: false })
    .limit(limit);

  if (error || !events?.length) {
    return { published: 0, skipped: true };
  }

  let published = 0;

  for (const event of events) {
    const slug = buildArticleSlug(event.canonical_title, event.id);
    const row: GeneratedArticleInsert = {
      event_id: event.id,
      slug,
      headline: event.canonical_title,
      summary: event.event_summary,
      article_body: event.event_summary,
      hero_image_url: null,
      seo_title: event.canonical_title,
      seo_description: event.event_summary?.slice(0, 160) ?? null,
      reading_time: "3 min",
      language: "hi",
      tags: event.category ? [event.category] : [],
      published_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("generated_articles")
      .upsert(row, { onConflict: "slug", ignoreDuplicates: true });

    if (!upsertError) published++;
  }

  logNewsroom("generated", "publish_batch_complete", { published });

  return { published, skipped: false };
}
