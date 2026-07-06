import { isSupabaseConfigured } from "@/lib/supabase";
import type { ContentType, FeedPage, PlatformArticle } from "../content/types";
import { contentTypesForTopic, getPlatformTopic, isPlatformTopicSlug } from "../config/topics";
import { queryGeneratedAsPlatform } from "../db/queries";
import { sortByTrending } from "../content/validate";
import { ISR } from "../config/isr";

export type TopicFeedOptions = {
  slug: string;
  page?: number;
  pageSize?: number;
  useMock?: boolean;
};

export async function fetchTopicFeed(
  options: TopicFeedOptions
): Promise<FeedPage<PlatformArticle> & { topic: string | null }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 12;
  const useMock = options.useMock ?? false;

  const isTopic = await isPlatformTopicSlug(options.slug);
  if (!isTopic) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      fetchedAt: new Date().toISOString(),
      source: "supabase",
      topic: null,
    };
  }

  const topic = options.slug;

  if (useMock || !isSupabaseConfigured()) {
    const { MOCK_ARTICLES } = await import("../content/mock/articles");
    const types = new Set((await contentTypesForTopic(topic)) as ContentType[]);
    const filtered = MOCK_ARTICLES.filter((a) => types.has(a.category));
    const sorted = sortByTrending(filtered);
    const start = (page - 1) * pageSize;
    return {
      items: sorted.slice(start, start + pageSize),
      total: sorted.length,
      page,
      pageSize,
      fetchedAt: new Date().toISOString(),
      source: "mock",
      topic,
    };
  }

  const types = await contentTypesForTopic(topic);
  const offset = (page - 1) * pageSize;
  const generated = await queryGeneratedAsPlatform({
    limit: pageSize + 20,
    offset,
  });
  const items = generated.filter((g) =>
    types.some((t) => g.category === t || g.tags.some((tag) => tag.includes(t)))
  );

  const sorted = sortByTrending(items);
  const slice = sorted.slice(0, pageSize);

  return {
    items: slice,
    total: sorted.length,
    page,
    pageSize,
    fetchedAt: new Date().toISOString(),
    source: "supabase",
    topic,
  };
}

export async function getTopicHubMeta(slug: string) {
  return getPlatformTopic(slug);
}

export const topicRevalidate = ISR.topicHub;
