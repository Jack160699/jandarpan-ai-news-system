import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/types";
import { getPublicSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/saas-auth/session";
import { secureCookieOptions } from "@/lib/security/cookies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function applyCookies(response: NextResponse, cookies: CookieToSet[]) {
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, {
      ...secureCookieOptions(
        name === REFRESH_COOKIE ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7
      ),
      ...options,
    });
  }
}

export async function POST(request: NextRequest) {
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const password = body.password ?? "";
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "password_too_short" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "auth_unavailable" }, { status: 503 });
  }

  const { url, anonKey } = getPublicSupabaseEnv();
  const pendingCookies: CookieToSet[] = [];

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll: () =>
        request.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
      setAll: (cookies) => {
        pendingCookies.push(...cookies);
      },
    },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json(
      { ok: false, error: "invalid_or_expired_token" },
      { status: 401 }
    );
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message.includes("same") ? "password_unchanged" : "reset_failed" },
      { status: 400 }
    );
  }

  const response = NextResponse.json({ ok: true });
  applyCookies(response, pendingCookies);

  // Ensure session cookies exist after recovery
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session) {
    response.cookies.set(ACCESS_COOKIE, sessionData.session.access_token, secureCookieOptions(60 * 60 * 24 * 7));
    response.cookies.set(
      REFRESH_COOKIE,
      sessionData.session.refresh_token,
      secureCookieOptions(60 * 60 * 24 * 30)
    );
  }

  return response;
}
