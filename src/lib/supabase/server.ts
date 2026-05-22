/**
 * Server Supabase clients — Node.js / serverless (never import in client components)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  getPublicSupabaseEnv,
  getServiceRoleEnv,
} from "@/lib/supabase/env";

const serverFetch =
  typeof globalThis.fetch === "function"
    ? globalThis.fetch.bind(globalThis)
    : undefined;

function clientOptions() {
  return {
    auth: {
      persistSession: false as const,
      autoRefreshToken: false as const,
    },
    global: serverFetch ? { fetch: serverFetch } : undefined,
  };
}

/**
 * Server anon read client — same key as browser (RLS applies)
 */
export function createAnonServerClient(): SupabaseClient<Database> {
  const { url, anonKey } = getPublicSupabaseEnv();
  return createClient<Database>(url, anonKey, clientOptions());
}

/** @deprecated Use createAnonServerClient */
export const createServerAnonClient = createAnonServerClient;

/**
 * Server admin client — SUPABASE_SERVICE_ROLE_KEY only (bypasses RLS)
 */
export function createAdminServerClient(): SupabaseClient<Database> {
  const { url, serviceRoleKey } = getServiceRoleEnv();
  return createClient<Database>(url, serviceRoleKey, clientOptions());
}

/** @deprecated Use createAdminServerClient */
export const createAdminClient = createAdminServerClient;
