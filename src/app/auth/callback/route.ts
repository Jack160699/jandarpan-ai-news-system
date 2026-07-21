import { NextResponse } from "next/server";
import { createCookieServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { sanitizeReaderReturnUrl } from "@/lib/auth/reader-return-url";

/**
 * OAuth PKCE callback — exchanges `code` for a session and redirects safely.
 * Google / magic-link flows should set redirectTo to `/auth/callback?next=...`.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextRaw = url.searchParams.get("next");
  const oauthError =
    url.searchParams.get("error") ||
    url.searchParams.get("error_description") ||
    url.searchParams.get("error_code");

  const next = sanitizeReaderReturnUrl(nextRaw, "/archive");

  if (oauthError) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("authError", "denied");
    return NextResponse.redirect(login);
  }

  if (!code) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("authError", "missing_code");
    return NextResponse.redirect(login);
  }

  if (!isSupabaseConfigured()) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("authError", "not_configured");
    return NextResponse.redirect(login);
  }

  try {
    const supabase = await createCookieServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const login = new URL("/login", url.origin);
      login.searchParams.set("authError", "exchange_failed");
      return NextResponse.redirect(login);
    }
  } catch {
    const login = new URL("/login", url.origin);
    login.searchParams.set("authError", "exchange_failed");
    return NextResponse.redirect(login);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
