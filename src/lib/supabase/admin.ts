/**
 * Admin / service-role Supabase client — bypasses RLS.
 * NEVER import in Client Components or any file with "use client".
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getServiceRoleEnv } from "@/lib/supabase/env";
import { assertServerOnly } from "@/utils/env";

const globalForSupabase = globalThis as unknown as {
  __supabaseAdmin?: SupabaseClient<Database>;
};

function adminOptions() {
  return {
    auth: {
      persistSession: false as const,
      autoRefreshToken: false as const,
    },
    global:
      typeof globalThis.fetch === "function"
        ? { fetch: globalThis.fetch.bind(globalThis) }
        : undefined,
  };
}

/**
 * Service-role client — singleton per server process (safe for hot reload).
 */
export function createAdminServerClient(): SupabaseClient<Database> {
  assertServerOnly("createAdminServerClient");

  if (globalForSupabase.__supabaseAdmin) {
    return globalForSupabase.__supabaseAdmin;
  }

  const { url, serviceRoleKey } = getServiceRoleEnv();
  const client = createClient<Database>(url, serviceRoleKey, adminOptions());

  if (process.env.NODE_ENV !== "production") {
    globalForSupabase.__supabaseAdmin = client;
  }

  return client;
}

/** @deprecated Use createAdminServerClient */
export const createAdminClient = createAdminServerClient;
