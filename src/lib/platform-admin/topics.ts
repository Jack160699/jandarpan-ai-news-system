import type { TopicHubMeta } from "@/lib/newsroom-platform/content/types";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { TopicRow } from "@/lib/newsroom-platform/db/types";
import type { AdminTopicRecord } from "./types";

async function countByContentTypes(): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  if (!isSupabaseConfigured()) return map;

  const supabase = createAdminServerClient();
  const { data: topics } = await supabase
    .from("platform_topics")
    .select("slug, content_types");

  const { data: platformArticles } = await supabase
    .from("platform_articles")
    .select("category");

  const { data: generated } = await supabase
    .from("generated_articles")
    .select("tags, editorial_metadata")
    .limit(400);

  for (const topic of topics ?? []) {
    const types = (topic.content_types as string[]) ?? [];
    let count = 0;
    for (const row of platformArticles ?? []) {
      if (types.includes(row.category as string)) count += 1;
    }
    for (const row of generated ?? []) {
      const meta = (row.editorial_metadata ?? {}) as Record<string, unknown>;
      const cat = meta.category as string | undefined;
      if (cat && types.includes(cat)) count += 1;
      else if (
        types.some((t) =>
          (row.tags as string[] | null)?.some((tag) =>
            tag.toLowerCase().includes(t.replace("_", ""))
          )
        )
      ) {
        count += 1;
      }
    }
    map.set(topic.slug as string, count);
  }
  return map;
}

export async function listAdminTopics(): Promise<AdminTopicRecord[] | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminServerClient();
  const { data, error } = await supabase
    .from("platform_topics")
    .select("*")
    .order("trend_score", { ascending: false });

  if (error) {
    console.error("[platform-admin] topics:", error.message);
    return null;
  }

  const counts = await countByContentTypes();

  return ((data ?? []) as TopicRow[]).map((row) => {
    const extended = row as TopicRow & {
      seo_title?: string | null;
      seo_description?: string | null;
      content_types?: string[];
      trend_score?: number;
      article_count_cache?: number;
      ai_keyword_suggestions?: string[];
      updated_at?: string;
    };
    return {
      slug: extended.slug,
      titleEn: extended.title_en,
      titleHi: extended.title_hi,
      descriptionEn: extended.description_en,
      descriptionHi: extended.description_hi,
      keywords: extended.keywords ?? [],
      contentTypes: extended.content_types ?? [],
      enabled: extended.enabled,
      seoTitle: extended.seo_title ?? null,
      seoDescription: extended.seo_description ?? null,
      trendScore: Number(extended.trend_score ?? 0),
      articleCount: counts.get(extended.slug) ?? extended.article_count_cache ?? 0,
      views7d: 0,
      aiKeywordSuggestions: extended.ai_keyword_suggestions ?? [],
      createdAt: extended.created_at ?? new Date().toISOString(),
      updatedAt: extended.updated_at ?? extended.created_at ?? new Date().toISOString(),
    };
  });
}

export async function loadPlatformTopicsHub(): Promise<TopicHubMeta[]> {
  const rows = await listAdminTopics();
  if (!rows) return [];
  return rows
    .filter((t) => t.enabled)
    .map((t) => ({
      slug: t.slug,
      titleEn: t.titleEn,
      titleHi: t.titleHi,
      descriptionEn: t.descriptionEn ?? "",
      descriptionHi: t.descriptionHi ?? "",
      keywords: t.keywords,
      articleCount: t.articleCount,
    }));
}

export async function getPlatformTopicHub(slug: string): Promise<TopicHubMeta | null> {
  const all = await loadPlatformTopicsHub();
  return all.find((t) => t.slug === slug) ?? null;
}

export async function getPlatformTopicSlugs(): Promise<string[]> {
  const all = await loadPlatformTopicsHub();
  return all.map((t) => t.slug);
}

export function contentTypesForTopicSlug(
  slug: string,
  topics: TopicHubMeta[],
  records: AdminTopicRecord[] | null
): string[] {
  const rec = records?.find((t) => t.slug === slug);
  if (rec?.contentTypes?.length) return rec.contentTypes;
  const hub = topics.find((t) => t.slug === slug);
  if (!hub) return [];
  const fallback: Record<string, string[]> = {
    jobs: ["jobs"],
    sports: ["sports"],
    markets: ["markets"],
    "district-news": ["district_news"],
    yojana: ["yojana"],
    "fact-check": ["fact_checks"],
    education: ["education"],
    technology: ["tech"],
  };
  return fallback[slug] ?? [];
}

export async function patchAdminTopic(
  slug: string,
  patch: Partial<{
    titleEn: string;
    titleHi: string;
    descriptionEn: string;
    descriptionHi: string;
    keywords: string[];
    contentTypes: string[];
    enabled: boolean;
    seoTitle: string;
    seoDescription: string;
    aiKeywordSuggestions: string[];
  }>
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.titleEn) update.title_en = patch.titleEn;
  if (patch.titleHi) update.title_hi = patch.titleHi;
  if (patch.descriptionEn !== undefined) update.description_en = patch.descriptionEn;
  if (patch.descriptionHi !== undefined) update.description_hi = patch.descriptionHi;
  if (patch.keywords) update.keywords = patch.keywords;
  if (patch.contentTypes) update.content_types = patch.contentTypes;
  if (patch.enabled !== undefined) update.enabled = patch.enabled;
  if (patch.seoTitle !== undefined) update.seo_title = patch.seoTitle;
  if (patch.seoDescription !== undefined) update.seo_description = patch.seoDescription;
  if (patch.aiKeywordSuggestions) update.ai_keyword_suggestions = patch.aiKeywordSuggestions;

  const supabase = createAdminServerClient();
  const { error } = await supabase
    .from("platform_topics")
    .update(update as never)
    .eq("slug", slug);
  if (error) {
    console.error("[platform-admin] patch topic:", error.message);
    return false;
  }
  return true;
}
