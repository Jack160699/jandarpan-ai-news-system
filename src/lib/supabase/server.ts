/**
 * Server Supabase clients — App Router, Route Handlers, Server Actions.
 * Never import in Client Components.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/types";
import { getPublicSupabaseEnv } from "@/lib/supabase/env";
import { assertServerOnly } from "@/utils/env";

export { createAdminServerClient, createAdminClient } from "@/lib/supabase/admin";

export { createAnonServerClient, createServerAnonClient } from "@/lib/supabase/anon";

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
