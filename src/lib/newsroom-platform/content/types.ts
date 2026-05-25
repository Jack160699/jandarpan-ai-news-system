/**
 * Centralized newsroom content model — API-ready, mock-driven today.
 */

export const CONTENT_TYPES = [
  "breaking_news",
  "district_news",
  "national_news",
  "international_news",
  "jobs",
  "sports",
  "markets",
  "education",
  "tech",
  "fact_checks",
  "yojana",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export type NewsLanguage = "en" | "hi" | "cg" | "bn" | "mr" | "ta" | "ur";

export type PlatformSeoMeta = {
  title: string;
  description: string;
  keywords: string[];
  canonicalPath?: string;
  ogImage?: string;
};

export type PlatformArticle = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: ContentType;
  tags: string[];
  district: string | null;
  language: NewsLanguage;
  source: string;
  publishedAt: string;
  priority: number;
  breaking: boolean;
  seo: PlatformSeoMeta;
  aiSummary: string | null;
  views: number;
  trendingScore: number;
};

export type BreakingTickerItem = {
  id: string;
  headline: string;
  slug: string;
  category: ContentType;
  priority: number;
  publishedAt: string;
  expiresAt: string | null;
  accent: "breaking" | "live" | "alert";
};

export type DistrictHubMeta = {
  slug: string;
  nameEn: string;
  nameHi: string;
  storyCount: number;
  liveCount: number;
  sections: string[];
};

export type TopicHubMeta = {
  slug: string;
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  keywords: string[];
  articleCount: number;
};

export type GlobalBriefSegment = "national" | "international";

export type FeedPage<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  fetchedAt: string;
  source: "mock" | "supabase" | "hybrid";
};

export type SectionToggleKey =
  | "breaking"
  | "district_wire"
  | "global_brief"
  | "explore_topics"
  | "topic_hubs";

export type PlatformSectionConfig = {
  key: SectionToggleKey;
  enabled: boolean;
  labelEn: string;
  labelHi: string;
};
