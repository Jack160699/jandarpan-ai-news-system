import type { PlatformSectionConfig } from "@/lib/newsroom-platform/content/types";
import type { JsonObject } from "@/types/json";

export type PlatformArticleSource = "generated" | "platform";

export type AdminArticleListItem = {
  id: string;
  source: PlatformArticleSource;
  slug: string;
  title: string;
  excerpt: string | null;
  category: string | null;
  districtSlug: string | null;
  language: string | null;
  editorialStatus: string | null;
  workflowStatus: string | null;
  publishedAt: string | null;
  isBreaking: boolean;
  homepagePin: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  views: number;
  clicks: number;
  engagements: number;
  trendingScore: number;
  aiConfidence: number | null;
  createdAt: string;
  updatedAt: string | null;
};

export type AdminArticleListResult = {
  items: AdminArticleListItem[];
  total: number;
  page: number;
  pageSize: number;
  facets: {
    workflowStatuses: string[];
    editorialStatuses: string[];
    districts: string[];
    categories: string[];
  };
};

export type AdminDistrictRecord = {
  slug: string;
  nameEn: string;
  nameHi: string;
  priorityTier: number;
  enabled: boolean;
  sections: string[];
  homepageConfig: JsonObject;
  editorUserIds: string[];
  trendScore: number;
  articleCount: number;
  liveCount: number;
  views7d: number;
  metadata: JsonObject;
  createdAt: string;
  updatedAt: string;
};

export type AdminTopicRecord = {
  slug: string;
  titleEn: string;
  titleHi: string;
  descriptionEn: string | null;
  descriptionHi: string | null;
  keywords: string[];
  contentTypes: string[];
  enabled: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  trendScore: number;
  articleCount: number;
  views7d: number;
  aiKeywordSuggestions: string[];
  createdAt: string;
  updatedAt: string;
};

export type AdminSourceRecord = {
  id: string;
  sourceId: string | null;
  name: string;
  url: string | null;
  category: string | null;
  language: string | null;
  region: string | null;
  tier: string | null;
  enabled: boolean;
  trustScore: number;
  reliabilityScore: number;
  healthStatus: string;
  failureCount: number;
  consecutiveFailures: number;
  lastSuccessAt: string | null;
  articlesFetched24h: number;
  createdAt: string;
  updatedAt: string;
};

export type PlatformConfigBundle = {
  homepageSections: PlatformSectionConfig[];
  newsroomSettings: JsonObject;
};

export type ArticleListFilters = {
  page?: number;
  pageSize?: number;
  search?: string;
  source?: "all" | "generated" | "platform";
  workflowStatus?: string;
  editorialStatus?: string;
  district?: string;
  category?: string;
  language?: string;
  breaking?: boolean;
  published?: "all" | "published" | "draft";
};
