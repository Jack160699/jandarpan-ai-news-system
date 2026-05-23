/**
 * Supabase — single public entry point
 */

export type {
  Database,
  IngestionLogRow,
  IngestionFailureRow,
  RssSourceHealthRow,
  NewsAiQueueRow,
} from "@/lib/supabase/types";

export {
  CORE_ARTICLE_SELECT,
  EXTENDED_ARTICLE_SELECT,
} from "@/lib/supabase/types";

export {
  getSupabaseEnvDiagnostics,
  getPublicSupabaseEnv,
  getServiceRoleEnv,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export { createBrowserClient } from "@/lib/supabase/client";

export {
  createAnonServerClient,
  createServerAnonClient,
  createCookieServerClient,
} from "@/lib/supabase/server";

export { createAdminServerClient, createAdminClient } from "@/lib/supabase/admin";

export { updateSupabaseSession } from "@/lib/supabase/middleware";

export {
  signInWithPassword,
  signInWithGoogle,
  signInWithOtp,
  signOut,
  getServerAuthSession,
  createUserAuthClient,
} from "@/lib/supabase/auth";

export {
  fetchLatestNews,
  fetchArticleBySlug,
  fetchTrendingNews,
  fetchRegionalNews,
  fetchNewsByCategory,
  type PaginatedResult,
  type QueryResult,
  type PaginationParams,
} from "@/lib/supabase/queries";
