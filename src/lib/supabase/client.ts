/**
 * Browser Supabase client — anon/publishable key ONLY.
 */

"use client";

import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Canonical browser client — singleton per tab (hot-reload safe).
 */
export function createBrowserClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const { url, anonKey } = getPublicSupabaseEnv();
  browserClient = createSupabaseBrowserClient<Database>(url, anonKey);
  return browserClient;
}
