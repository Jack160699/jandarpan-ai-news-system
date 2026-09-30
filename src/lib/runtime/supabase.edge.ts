/**
 * Supabase Edge (Deno) view of the `@/lib/supabase` entry point.
 *
 * The full barrel also exports cookie/session helpers that import next/headers, @supabase/ssr and Next middleware -
 * none of which can execute in an Edge Function. The Edge bundle swaps `@/lib/supabase` for this module, which
 * re-exports ONLY the service-role / env API. This is not a stub: everything here is the real implementation, and
 * anything the worker's dependency graph tries to use beyond it (e.g. `createCookieServerClient`) fails the build
 * with "No matching export", so an incompatibility can never be silently hidden.
 */

export type { Database } from "@/lib/supabase/types";

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

export { createAdminServerClient, createAdminClient } from "@/lib/supabase/admin";
