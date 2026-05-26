import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import type { BreakingTickerItem, FeedPage } from "../content/types";
import {
  buildMockBreakingTicker,
  filterActiveBreaking,
} from "../content/mock/breaking";
import { sortByPriority } from "../content/validate";
import { ISR } from "../config/isr";

export type BreakingFeedOptions = {
  limit?: number;
  useMock?: boolean;
};

export async function fetchBreakingFeed(
  options: BreakingFeedOptions = {}
): Promise<FeedPage<BreakingTickerItem>> {
  const limit = options.limit ?? 12;
  const useMock = options.useMock ?? false;

  if (!useMock && isSupabaseConfigured()) {
    const supabase = createAdminServerClient();
    const { data } = await supabase
      .from("platform_breaking_news")
      .select("id, headline, slug, priority, created_at, expires_at")
      .eq("is_active", true)
      .order("priority", { ascending: false })
      .limit(limit);

    if (data?.length) {
      const items: BreakingTickerItem[] = data.map((row) => ({
        id: row.id,
        headline: row.headline,
        slug: row.slug ?? row.id,
        category: "breaking_news",
        priority: row.priority,
        publishedAt: row.created_at,
        expiresAt: row.expires_at,
        accent: "breaking" as const,
      }));

      return {
        items,
        total: items.length,
        page: 1,
        pageSize: limit,
        fetchedAt: new Date().toISOString(),
        source: "supabase",
      };
    }

    const { data: articles } = await supabase
      .from("generated_articles")
      .select("id, slug, headline, published_at, editorial_metadata")
      .not("published_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(limit * 2);

    const breakingItems = (articles ?? [])
      .filter((a) => {
        const meta = (a.editorial_metadata ?? {}) as Record<string, unknown>;
        return Boolean(meta.is_breaking);
      })
      .slice(0, limit)
      .map((a) => ({
        id: a.id,
        headline: a.headline,
        slug: a.slug,
        category: "breaking_news" as const,
        priority: 90,
        publishedAt: a.published_at ?? new Date().toISOString(),
        expiresAt: null,
        accent: "breaking" as const,
      }));

    if (breakingItems.length) {
      return {
        items: breakingItems,
        total: breakingItems.length,
        page: 1,
        pageSize: limit,
        fetchedAt: new Date().toISOString(),
        source: "supabase",
      };
    }
  }

  const active = filterActiveBreaking(buildMockBreakingTicker());
  const sorted = sortByPriority(active).slice(0, limit);

  return {
    items: sorted,
    total: sorted.length,
    page: 1,
    pageSize: limit,
    fetchedAt: new Date().toISOString(),
    source: useMock ? "mock" : "supabase",
  };
}

export const breakingRevalidate = ISR.breaking;
