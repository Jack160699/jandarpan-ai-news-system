/**
 * Stateless anon Supabase client (public reads under RLS, no user session).
 *
 * Lives in its own module - with NO next/headers / @supabase/ssr import - so it can be used by the Supabase Edge
 * workers as well as the Next.js app. server.ts re-exports it unchanged.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { LIVE_FETCH_INIT } from "@/lib/news/fetch-policy";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { assertServerOnly } from "@/utils/env";

const baseFetch =
  typeof globalThis.fetch === "function"
    ? globalThis.fetch.bind(globalThis)
    : undefined;

/**
 * Supabase REST - bypass Next cache but preserve Supabase Headers (apikey, Authorization).
 * Do NOT use withLiveFetchInit here: it replaces Headers objects and drops apikey.
 */
function supabaseFetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (!baseFetch) {
    throw new Error("fetch is not available in this runtime");
  }
  return baseFetch(url, {
    ...init,
    cache: LIVE_FETCH_INIT.cache,
    next: LIVE_FETCH_INIT.next,
  });
}

function anonOptions() {
  return {
    auth: {
      persistSession: false as const,
      autoRefreshToken: false as const,
    },
    global: baseFetch ? { fetch: supabaseFetch } : undefined,
  };
}

/**
 * Stateless anon server client - public reads under RLS (no user session).
 */
export function createAnonServerClient(): SupabaseClient<Database> {
  assertServerOnly("createAnonServerClient");
  const { url, anonKey } = getPublicSupabaseEnv();
  return createClient<Database>(url, anonKey, anonOptions());
}

/** @deprecated Use createAnonServerClient */
export const createServerAnonClient = createAnonServerClient;
