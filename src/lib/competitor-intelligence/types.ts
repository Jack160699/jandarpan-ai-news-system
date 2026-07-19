/**
 * Competitor Intelligence Engine — shared types (Phase 11A)
 */

export type CompetitorSourceRow = {
  id: string;
  name: string;
  homepage: string;
  feed_url: string | null;
  language: string;
  region: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type CompetitorArticleRow = {
  id: string;
  source_id: string;
  url: string;
  title: string;
  description: string | null;
  category: string | null;
  district: string | null;
  language: string | null;
  author: string | null;
  published_at: string | null;
  fetched_at: string;
  image: string | null;
  word_count: number | null;
  headings: string[];
  canonical: string | null;
  schema_detected: Record<string, unknown>;
  open_graph: Record<string, string>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CompetitorRunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: "running" | "completed" | "failed" | "skipped";
  articles_found: number;
  articles_saved: number;
  errors: string[];
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ParsedCompetitorArticle = {
  url: string;
  title: string;
  description?: string | null;
  category?: string | null;
  district?: string | null;
  language?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  image?: string | null;
  wordCount?: number | null;
  headings?: string[];
  canonical?: string | null;
  schemaDetected?: Record<string, unknown>;
  openGraph?: Record<string, string>;
  metadata?: Record<string, unknown>;
};

export type CompetitorCrawlResult = {
  ok: boolean;
  runId: string | null;
  status: CompetitorRunRow["status"];
  articlesFound: number;
  articlesSaved: number;
  duplicates: number;
  errors: string[];
  durationMs: number;
  sourcesCrawled: number;
  /** Sources selected for this tick (batch size). */
  sourcesAttempted: number;
  /** True when more sources remain for a later tick. */
  continued: boolean;
  nextCursorSourceId: string | null;
  timedOutSources: number;
  retryableFailures: number;
  /** Partial success — saved some articles or crawled some sources despite errors/timeouts. */
  partialSuccess?: boolean;
  skippedReason?: string;
};

export type CompetitorDashboardStats = {
  competitorsMonitored: number;
  totalArticles: number;
  newArticlesToday: number;
  failedCrawls24h: number;
  latestCrawl: {
    id: string;
    startedAt: string;
    finishedAt: string | null;
    status: CompetitorRunRow["status"];
    articlesFound: number;
    articlesSaved: number;
    durationMs: number | null;
    errors: string[];
  } | null;
};

export type CompetitorArticleListItem = CompetitorArticleRow & {
  source_name: string;
};
