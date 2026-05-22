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
  createAdminServerClient,
  createAdminClient,
} from "@/lib/supabase/server";
