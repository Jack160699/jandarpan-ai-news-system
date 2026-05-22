/**
 * Browser Supabase client — anon/publishable key ONLY
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Canonical browser client — uses NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
 */
export function createBrowserClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error(
      "createBrowserClient() is for browser runtime only — use createAnonServerClient() on the server"
    );
  }

  if (browserClient) return browserClient;

  const { url, anonKey } = getPublicSupabaseEnv();

  browserClient = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return browserClient;
}
