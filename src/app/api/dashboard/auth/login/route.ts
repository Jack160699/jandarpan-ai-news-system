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

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function applyCookies(response: NextResponse, cookies: CookieToSet[]) {
  const secure = process.env.NODE_ENV === "production";
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, {
      path: "/",
      sameSite: "lax",
      httpOnly: true,
      secure,
      ...options,
    });
  }
}

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        ok: false,
        error: "configure_supabase",
        message: "Set Supabase env vars and create a tenant membership for login.",
      });
    }
    return NextResponse.json({ ok: false, error: "auth_unavailable" }, { status: 503 });
  }

  const email = body.email?.trim();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "email_password_required" },
      { status: 400 }
    );
  }

  const pendingCookies: CookieToSet[] = [];
  const { url, anonKey } = getPublicSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          pendingCookies.push({
            name: cookie.name,
            value: cookie.value,
            options: cookie.options,
          });
        }
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "login_failed" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    email: data.user.email,
    userId: data.user.id,
  });

  applyCookies(response, pendingCookies);
  applyCookies(response, [
    {
      name: ACCESS_COOKIE,
      value: data.session.access_token,
      options: { maxAge: 60 * 60 * 24 * 7 },
    },
    {
      name: REFRESH_COOKIE,
      value: data.session.refresh_token,
      options: { maxAge: 60 * 60 * 24 * 30 },
    },
  ]);

  return response;
}
