/**
 * Hybrid ingestion — shared types
 */

export type NewsRegion = "india" | "chhattisgarh" | "global";

export type NewsProviderId = "gnews" | "newsdata" | "rss";

/** Normalized article from any provider before DB mapping */
export type NormalizedArticle = {
  title: string;
  description: string | null;
  content: string | null;
  image_url: string | null;
  source: string | null;
  author: string | null;
  category: string;
  published_at: string | null;
  article_url: string;
  provider: NewsProviderId;
  language: string | null;
  region: NewsRegion;
};

export type ProviderFetchResult = {
  provider: NewsProviderId;
  label: string;
  articles: NormalizedArticle[];
  fetched: number;
  valid: number;
  errors: string[];
  durationMs: number;
};

export type HybridFetchResult = {
  ok: boolean;
  providers: ProviderFetchResult[];
  articles: NormalizedArticle[];
  errors: string[];
  durationMs: number;
};

export type IngestionStats = {
  inserted: number;
  skippedDuplicates: number;
  failedValidation: number;
  totalFetched: number;
  aiProcessed: number;
  durationMs: number;
};
