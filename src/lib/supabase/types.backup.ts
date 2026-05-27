/**
 * Supabase database types
 */

import type { NewsArticleRow, NewsArticleInsert } from "@/lib/types/news-article";
import type {
  GeneratedArticleRow,
  GeneratedArticleInsert,
  NewsEventRow,
  NewsEventInsert,
  NewsSignalRow,
  NewsSignalInsert,
} from "@/lib/types/newsroom";

export type NewsroomTenantRow = {
  id: string;
  slug: string;
  name: string | null;
  status: string;
  domains: string[];
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type NewsroomTenantInsert = {
  slug: string;
  name?: string | null;
  status?: string;
  domains?: string[];
  config?: Record<string, unknown>;
  updated_at?: string;
};

export type TenantMembershipRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string;
  role: string;
  status: string;
  display_name: string | null;
  avatar_url: string | null;
  permissions: Record<string, unknown>;
  metadata: Record<string, unknown>;
  invited_by: string | null;
  last_login_at: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
};

export type TenantMembershipInsert = {
  tenant_id: string;
  user_id: string;
  email: string;
  role?: string;
  status?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  permissions?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  invited_by?: string | null;
  last_login_at?: string | null;
  joined_at?: string;
  updated_at?: string;
};

export type EditorialAuditRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type EditorialAuditInsert = {
  tenant_id: string;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  resource_type?: string;
  resource_id?: string | null;
  payload?: Record<string, unknown>;
};

export type TenantBillingRow = {
  tenant_id: string;
  plan_id: string;
  plan_status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  articles_limit: number;
  api_calls_limit: number;
  articles_used: number;
  api_calls_used: number;
  current_period_start: string | null;
  current_period_end: string | null;
  metadata: Record<string, unknown>;
  updated_at: string;
};

export type TenantBillingInsert = Partial<TenantBillingRow> & {
  tenant_id: string;
};

export type TenantApiRequestRow = {
  id: string;
  tenant_id: string | null;
  route: string;
  method: string;
  status_code: number | null;
  latency_ms: number | null;
  provider: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type TenantApiRequestInsert = {
  tenant_id?: string | null;
  route: string;
  method?: string;
  status_code?: number | null;
  latency_ms?: number | null;
  provider?: string | null;
  error_message?: string | null;
  metadata?: Record<string, unknown>;
};

export type MonetizationPlacementRow = {
  id: string;
  tenant_id: string;
  slot_id: string;
  placement_type: string;
  label: string | null;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type MonetizationPlacementInsert = Partial<MonetizationPlacementRow> & {
  tenant_id: string;
  slot_id: string;
};

export type SponsoredStoryRow = {
  id: string;
  tenant_id: string;
  article_slug: string;
  sponsor_name: string;
  sponsor_logo_url: string | null;
  disclosure_en: string;
  disclosure_hi: string | null;
  cta_url: string | null;
  cta_label: string | null;
  active_from: string | null;
  active_until: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SponsoredStoryInsert = Partial<SponsoredStoryRow> & {
  tenant_id: string;
  article_slug: string;
  sponsor_name: string;
};

export type ReaderPlanRow = {
  id: string;
  tenant_id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  price_inr: number;
  billing_interval: string;
  features: unknown;
  stripe_price_id: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

export type ReaderPlanInsert = Partial<ReaderPlanRow> & {
  tenant_id: string;
  slug: string;
  name_en: string;
};

export type ReaderSubscriptionRow = {
  id: string;
  tenant_id: string;
  plan_id: string | null;
  email: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ReaderSubscriptionInsert = Partial<ReaderSubscriptionRow> & {
  tenant_id: string;
  email: string;
};

export type PremiumReportRow = {
  id: string;
  tenant_id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  hero_image_url: string | null;
  price_inr: number;
  is_paywalled: boolean;
  content_path: string | null;
  published_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type PremiumReportInsert = Partial<PremiumReportRow> & {
  tenant_id: string;
  slug: string;
  title: string;
};

export type NewsletterRow = {
  id: string;
  tenant_id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  frequency: string;
  description: string | null;
  active: boolean;
  created_at: string;
};

export type NewsletterInsert = Partial<NewsletterRow> & {
  tenant_id: string;
  slug: string;
  name_en: string;
};

export type NewsletterSubscriberRow = {
  id: string;
  newsletter_id: string;
  email: string;
  status: string;
  confirmed_at: string | null;
  created_at: string;
};

export type NewsletterSubscriberInsert = {
  newsletter_id: string;
  email: string;
  status?: string;
};

export type AffiliatePlacementRow = {
  id: string;
  tenant_id: string;
  slot_id: string;
  partner_name: string;
  title: string;
  description: string | null;
  image_url: string | null;
  target_url: string;
  disclosure_en: string | null;
  disclosure_hi: string | null;
  enabled: boolean;
  sort_order: number;
  created_at: string;
};

export type AffiliatePlacementInsert = Partial<AffiliatePlacementRow> & {
  tenant_id: string;
  slot_id: string;
  partner_name: string;
  title: string;
  target_url: string;
};

export type MonetizationEventRow = {
  id: string;
  tenant_id: string | null;
  event_type: string;
  slot_id: string | null;
  placement_type: string | null;
  article_slug: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type MonetizationEventInsert = {
  tenant_id?: string | null;
  event_type: string;
  slot_id?: string | null;
  placement_type?: string | null;
  article_slug?: string | null;
  metadata?: Record<string, unknown>;
};

export type ReaderAnalyticsEventRow = {
  id: string;
  tenant_id: string | null;
  event_type: string;
  article_slug: string | null;
  session_hash: string | null;
  category: string | null;
  region: string | null;
  surface: string | null;
  value_num: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ReaderAnalyticsEventInsert = {
  tenant_id?: string | null;
  event_type: string;
  article_slug?: string | null;
  session_hash?: string | null;
  category?: string | null;
  region?: string | null;
  surface?: string | null;
  value_num?: number | null;
  metadata?: Record<string, unknown>;
};

export type ArticleMetricsDailyRow = {
  tenant_id: string;
  article_slug: string;
  bucket_date: string;
  views: number;
  clicks: number;
  engagements: number;
  total_dwell_ms: number;
  scroll_samples: number;
  scroll_depth_sum: number;
  updated_at: string;
};

export type ArticleMetricsDailyInsert = Partial<ArticleMetricsDailyRow> & {
  tenant_id: string;
  article_slug: string;
  bucket_date?: string;
};

export type BreakingVelocityRow = {
  id: string;
  tenant_id: string | null;
  article_slug: string;
  views_1h: number;
  views_24h: number;
  velocity_score: number;
  is_breaking: boolean;
  captured_at: string;
};

export type BreakingVelocityInsert = Partial<BreakingVelocityRow> & {
  tenant_id?: string | null;
  article_slug: string;
};

export type IngestionLogRow = {
  id: string;
  status: string;
  total_fetched: number;
  total_valid: number;
  inserted: number;
  skipped_duplicates: number;
  failed_validation: number;
  category_stats: Record<string, number> | null;
  provider_stats: Record<string, number> | null;
  provider_errors: string[] | null;
  duration_ms: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export type IngestionFailureRow = {
  id: string;
  title: string | null;
  article_url: string | null;
  provider: string | null;
  reason: string;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export type RssSourceHealthRow = {
  source_id: string;
  name: string;
  last_success: string | null;
  last_failure: string | null;
  failure_count: number;
  consecutive_failures: number;
  disabled_until: string | null;
  updated_at: string;
};

export type ApiProviderHealthRow = {
  provider_id: string;
  last_success: string | null;
  last_failure: string | null;
  failure_count: number;
  consecutive_failures: number;
  disabled_until: string | null;
  health_score: number;
  avg_latency_ms: number;
  last_article_count: number;
  updated_at: string;
};

export type NewsAiQueueRow = {
  id: string;
  article_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  processed_at: string | null;
  error: string | null;
};

export type EditorialImageQueueRow = {
  id: string;
  generated_article_id: string;
  status: "pending" | "processing" | "completed" | "failed";
  attempts: number;
  max_attempts: number;
  prompt_hash: string | null;
  hero_image_url: string | null;
  og_image_url: string | null;
  image_source: string | null;
  error: string | null;
  created_at: string;
  processed_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      news_articles: {
        Row: NewsArticleRow;
        Insert: NewsArticleInsert;
        Update: Partial<NewsArticleInsert>;
        Relationships: [];
      };
      ingestion_logs: {
        Row: IngestionLogRow;
        Insert: Partial<IngestionLogRow>;
        Update: Partial<IngestionLogRow>;
        Relationships: [];
      };
      ingestion_failures: {
        Row: IngestionFailureRow;
        Insert: Partial<IngestionFailureRow>;
        Update: Partial<IngestionFailureRow>;
        Relationships: [];
      };
      rss_source_health: {
        Row: RssSourceHealthRow;
        Insert: Partial<RssSourceHealthRow>;
        Update: Partial<RssSourceHealthRow>;
        Relationships: [];
      };
      api_provider_health: {
        Row: ApiProviderHealthRow;
        Insert: Partial<ApiProviderHealthRow>;
        Update: Partial<ApiProviderHealthRow>;
        Relationships: [];
      };
      news_ai_queue: {
        Row: NewsAiQueueRow;
        Insert: Partial<NewsAiQueueRow>;
        Update: Partial<NewsAiQueueRow>;
        Relationships: [];
      };
      newsroom_tenants: {
        Row: NewsroomTenantRow;
        Insert: NewsroomTenantInsert;
        Update: Partial<NewsroomTenantInsert>;
        Relationships: [];
      };
      tenant_memberships: {
        Row: TenantMembershipRow;
        Insert: TenantMembershipInsert;
        Update: Partial<TenantMembershipInsert>;
        Relationships: [];
      };
      editorial_audit_log: {
        Row: EditorialAuditRow;
        Insert: EditorialAuditInsert;
        Update: Partial<EditorialAuditInsert>;
        Relationships: [];
      };
      tenant_billing: {
        Row: TenantBillingRow;
        Insert: TenantBillingInsert;
        Update: Partial<TenantBillingInsert>;
        Relationships: [];
      };
      tenant_api_requests: {
        Row: TenantApiRequestRow;
        Insert: TenantApiRequestInsert;
        Update: Partial<TenantApiRequestInsert>;
        Relationships: [];
      };
      monetization_placements: {
        Row: MonetizationPlacementRow;
        Insert: MonetizationPlacementInsert;
        Update: Partial<MonetizationPlacementInsert>;
        Relationships: [];
      };
      sponsored_stories: {
        Row: SponsoredStoryRow;
        Insert: SponsoredStoryInsert;
        Update: Partial<SponsoredStoryInsert>;
        Relationships: [];
      };
      reader_plans: {
        Row: ReaderPlanRow;
        Insert: ReaderPlanInsert;
        Update: Partial<ReaderPlanInsert>;
        Relationships: [];
      };
      reader_subscriptions: {
        Row: ReaderSubscriptionRow;
        Insert: ReaderSubscriptionInsert;
        Update: Partial<ReaderSubscriptionInsert>;
        Relationships: [];
      };
      premium_reports: {
        Row: PremiumReportRow;
        Insert: PremiumReportInsert;
        Update: Partial<PremiumReportInsert>;
        Relationships: [];
      };
      newsletters: {
        Row: NewsletterRow;
        Insert: NewsletterInsert;
        Update: Partial<NewsletterInsert>;
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: NewsletterSubscriberRow;
        Insert: NewsletterSubscriberInsert;
        Update: Partial<NewsletterSubscriberInsert>;
        Relationships: [];
      };
      affiliate_placements: {
        Row: AffiliatePlacementRow;
        Insert: AffiliatePlacementInsert;
        Update: Partial<AffiliatePlacementInsert>;
        Relationships: [];
      };
      monetization_events: {
        Row: MonetizationEventRow;
        Insert: MonetizationEventInsert;
        Update: Partial<MonetizationEventInsert>;
        Relationships: [];
      };
      reader_analytics_events: {
        Row: ReaderAnalyticsEventRow;
        Insert: ReaderAnalyticsEventInsert;
        Update: Partial<ReaderAnalyticsEventInsert>;
        Relationships: [];
      };
      article_metrics_daily: {
        Row: ArticleMetricsDailyRow;
        Insert: ArticleMetricsDailyInsert;
        Update: Partial<ArticleMetricsDailyInsert>;
        Relationships: [];
      };
      breaking_velocity_snapshots: {
        Row: BreakingVelocityRow;
        Insert: BreakingVelocityInsert;
        Update: Partial<BreakingVelocityInsert>;
        Relationships: [];
      };
      news_signals: {
        Row: NewsSignalRow;
        Insert: NewsSignalInsert;
        Update: Partial<NewsSignalInsert>;
        Relationships: [];
      };
      news_events: {
        Row: NewsEventRow;
        Insert: NewsEventInsert;
        Update: Partial<NewsEventInsert>;
        Relationships: [];
      };
      generated_articles: {
        Row: GeneratedArticleRow;
        Insert: GeneratedArticleInsert;
        Update: Partial<GeneratedArticleInsert>;
        Relationships: [];
      };
      coverage_updates: {
        Row: import("@/lib/types/newsroom").CoverageUpdateRow;
        Insert: import("@/lib/types/newsroom").CoverageUpdateInsert;
        Update: Partial<import("@/lib/types/newsroom").CoverageUpdateInsert>;
        Relationships: [];
      };
      editorial_image_queue: {
        Row: EditorialImageQueueRow;
        Insert: Partial<EditorialImageQueueRow>;
        Update: Partial<EditorialImageQueueRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

/** Safe column list for anon reads (matches minimal + extended schemas) */
export const CORE_ARTICLE_SELECT =
  "id,title,description,content,image_url,source,author,category,article_url,slug,published_at,created_at";

export const EXTENDED_ARTICLE_SELECT =
  `${CORE_ARTICLE_SELECT},updated_at,language,region,title_hash,url_hash,ai_summary,ai_headline,ai_processed_at`;
