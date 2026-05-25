/**
 * Supabase-ready row shapes for migration 022 — mirrors platform content model.
 */

export type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category: string;
  tags: string[];
  district_slug: string | null;
  language: string;
  source_name: string | null;
  published_at: string;
  priority: number;
  is_breaking: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[] | null;
  ai_summary: string | null;
  views: number;
  trending_score: number;
  created_at: string;
  updated_at: string;
};

export type DistrictRow = {
  slug: string;
  name_en: string;
  name_hi: string;
  priority_tier: number;
  enabled: boolean;
  metadata: Record<string, unknown>;
};

export type TopicRow = {
  slug: string;
  title_en: string;
  title_hi: string;
  description_en: string | null;
  description_hi: string | null;
  keywords: string[];
  enabled: boolean;
};

export type BreakingNewsRow = {
  id: string;
  article_id: string | null;
  headline: string;
  slug: string | null;
  priority: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export type ArticleSourceRow = {
  id: string;
  name: string;
  url: string | null;
  enabled: boolean;
  trust_score: number;
};

export type AiLogRow = {
  id: string;
  article_id: string | null;
  job_type: string;
  status: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  created_at: string;
};
