/**
 * Server Supabase clients — App Router, Route Handlers, Server Actions.
 * Never import in Client Components.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";
import { LIVE_FETCH_INIT } from "@/lib/news/fetch-policy";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { assertServerOnly } from "@/utils/env";

export { createAdminServerClient, createAdminClient } from "@/lib/supabase/admin";

const baseFetch =
  typeof globalThis.fetch === "function"
    ? globalThis.fetch.bind(globalThis)
    : undefined;

/**
 * Supabase REST — bypass Next cache but preserve Supabase Headers (apikey, Authorization).
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
 * Stateless anon server client — public reads under RLS (no user session).
 */
export function createAnonServerClient(): SupabaseClient<Database> {
  assertServerOnly("createAnonServerClient");
  const { url, anonKey } = getPublicSupabaseEnv();
  return createClient<Database>(url, anonKey, anonOptions());
}

/** @deprecated Use createAnonServerClient */
export const createServerAnonClient = createAnonServerClient;

/**
 * Cookie-aware server client — respects logged-in user JWT from Supabase Auth cookies.
 * Use in Server Components, Server Actions, and Route Handlers that need the user session.
 */
export async function createCookieServerClient(): Promise<
  SupabaseClient<Database>
> {
  assertServerOnly("createCookieServerClient");
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll from Server Component without mutable cookies — middleware handles refresh
        }
      },
    },
  });
}
