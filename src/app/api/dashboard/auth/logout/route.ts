import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { getPublicSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from "@/lib/saas-auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set(ACCESS_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure,
    sameSite: "lax",
  });
  response.cookies.set(REFRESH_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure,
    sameSite: "lax",
  });

  if (isSupabaseConfigured()) {
    const pending: { name: string; value: string }[] = [];
    const { url, anonKey } = getPublicSupabaseEnv();

    const supabase = createServerClient<Database>(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const c of cookiesToSet) {
            pending.push({ name: c.name, value: c.value });
          }
        },
      },
    });

    await supabase.auth.signOut();

    for (const c of pending) {
      response.cookies.set(c.name, c.value, {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure,
        sameSite: "lax",
      });
    }
  }

  return response;
}
