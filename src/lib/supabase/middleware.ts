/**
 * Supabase session refresh for Next.js middleware (Edge-compatible).
 *
 * Call only when {@link requiresMiddlewareSupabaseAuth} is true — public
 * reader traffic must not invoke auth.getUser().
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeGetUser } from "@/lib/auth/auth-safe";
import type { Database } from "@/lib/supabase/types";
import { getPublicSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";

export type SupabaseMiddlewareResult = {
  response: NextResponse;
  user: { id: string; email?: string } | null;
  /** True when getUser timed out — caller may fail-open for client-side auth */
  timedOut: boolean;
};

export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse
): Promise<SupabaseMiddlewareResult> {
  if (!isSupabaseConfigured()) {
    return { response, user: null, timedOut: false };
  }

  const { url, anonKey } = getPublicSupabaseEnv();

  const supabaseResponse = response;

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { user, timedOut } = await safeGetUser(supabase, "middleware_getUser");

  return {
    response: supabaseResponse,
    user: user ?? null,
    timedOut,
  };
}
