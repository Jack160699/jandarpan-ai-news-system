/**
 * Supabase session refresh for Next.js middleware (Edge-compatible).
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { getPublicSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import { withTimeoutFallback } from "@/lib/utils/withTimeout";

export type SupabaseMiddlewareResult = {
  response: NextResponse;
  user: { id: string; email?: string } | null;
};

/**
 * Refreshes the Supabase auth session and returns the user (if any).
 * Call from root middleware after tenant headers are set.
 */
export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<SupabaseMiddlewareResult> {
  if (!isSupabaseConfigured()) {
    return { response, user: null };
  }

  const { url, anonKey } = getPublicSupabaseEnv();

  let supabaseResponse = response;

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await withTimeoutFallback(
    supabase.auth.getUser(),
    { data: { user: null }, error: null },
    { label: "middleware_getUser", timeoutMs: 4_000 }
  );

  return { response: supabaseResponse, user: user ?? null };
}
