/** Row shape for `news_articles` Supabase table */
export type NewsArticleRow = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  source: string | null;
  author: string | null;
  category: string;
  article_url: string;
  slug: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  provider: string | null;
  language: string | null;
  region: string | null;
  title_hash: string | null;
  url_hash: string | null;
  ai_summary: string | null;
  ai_headline: string | null;
  ai_processed_at: string | null;
};

export type NewsCategory =
  | "business"
  | "technology"
  | "sports"
  | "entertainment"
  | "health"
  | "politics"
  | "world"
  | "local";

/** Categories shown on homepage live wire */
export const NEWS_INGEST_CATEGORIES: NewsCategory[] = [
  "local",
  "politics",
  "business",
  "technology",
  "sports",
  "entertainment",
  "health",
  "world",
];

export type NewsArticleInsert = {
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  source: string | null;
  author: string | null;
  category: string;
  article_url: string;
  slug?: string | null;
  published_at: string | null;
  provider?: string | null;
  language?: string | null;
  region?: string | null;
  title_hash?: string | null;
  url_hash?: string | null;
  ai_summary?: string | null;
  ai_headline?: string | null;
  ai_processed_at?: string | null;
};

export type HomepageAnalytics = {
  homepage_source_mix: Record<string, number>;
  regional_percentage: number;
  live_articles_count: number;
};

export type TopicTrend = {
  topic: string;
  count: number;
  articleId: string;
  title: string;
};

/** Homepage feed bundle — ranked for live regional priority */
export type LiveNewsFeed = {
  hero: NewsArticleRow | null;
  trending: NewsArticleRow[];
  justIn: NewsArticleRow[];
  topicTrends: TopicTrend[];
  byCategory: Record<NewsCategory, NewsArticleRow[]>;
  latest: NewsArticleRow[];
  fetchedAt: string;
  analytics: HomepageAnalytics;
};
