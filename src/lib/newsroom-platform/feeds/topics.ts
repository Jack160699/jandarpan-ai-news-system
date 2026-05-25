import type { ContentType, FeedPage, PlatformArticle } from "../content/types";
import {
  contentTypesForTopic,
  getPlatformTopic,
  isPlatformTopicSlug,
  type PlatformTopicSlug,
} from "../config/topics";
import { MOCK_ARTICLES } from "../content/mock/articles";
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
): Promise<FeedPage<PlatformArticle> & { topic: PlatformTopicSlug | null }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 12;
  const useMock = options.useMock ?? true;

  if (!isPlatformTopicSlug(options.slug)) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      fetchedAt: new Date().toISOString(),
      source: "mock",
      topic: null,
    };
  }

  const topic = options.slug;

  if (!useMock) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      fetchedAt: new Date().toISOString(),
      source: "supabase",
      topic,
    };
  }

  const types = new Set(contentTypesForTopic(topic) as ContentType[]);
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

export function getTopicHubMeta(slug: string) {
  return getPlatformTopic(slug);
}

export const topicRevalidate = ISR.topicHub;
