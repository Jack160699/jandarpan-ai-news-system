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
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NewsCategory =
  | "business"
  | "technology"
  | "sports"
  | "entertainment"
  | "health";

export const NEWS_INGEST_CATEGORIES: NewsCategory[] = [
  "business",
  "technology",
  "sports",
  "entertainment",
  "health",
];

export type NewsArticleInsert = {
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  source: string | null;
  author: string | null;
  category: NewsCategory;
  article_url: string;
  published_at: string | null;
};

/** Homepage feed bundle from Supabase */
export type LiveNewsFeed = {
  hero: NewsArticleRow | null;
  trending: NewsArticleRow[];
  byCategory: Record<NewsCategory, NewsArticleRow[]>;
  latest: NewsArticleRow[];
  fetchedAt: string;
};
