/**
 * Production auth foundation — email/password, OAuth-ready, OTP-ready.
 * UI lives in dashboard routes; this module is architecture only.
 */

import { createClient } from "@supabase/supabase-js";
import { getPublicSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import { createCookieServerClient } from "@/lib/supabase/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setSessionCookies,
  clearSessionCookies,
} from "@/lib/saas-auth/session";
import type { AuthError, Session, User } from "@supabase/supabase-js";

export type AuthSignInResult =
  | { ok: true; user: User; session: Session }
  | { ok: false; error: string };

export type AuthSessionState = {
  user: User | null;
  session: Session | null;
  error?: string;
};

/** Password sign-in — sets httpOnly legacy cookies + Supabase SSR cookies when available. */
export async function signInWithPassword(
  email: string,
  password: string
): Promise<AuthSignInResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const supabase = await createCookieServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.session) {
    return { ok: false, error: error?.message ?? "login_failed" };
  }

  await setSessionCookies(
    data.session.access_token,
    data.session.refresh_token
  );

  return { ok: true, user: data.user, session: data.session };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createCookieServerClient();
    await supabase.auth.signOut();
  }
  await clearSessionCookies();
}

/** Current session from cookie-aware server client. */
export async function getServerAuthSession(): Promise<AuthSessionState> {
  if (!isSupabaseConfigured()) {
    return { user: null, session: null, error: "not_configured" };
  }

  const supabase = await createCookieServerClient();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    return { user: null, session: null, error: error.message };
  }

  return {
    user: data.session?.user ?? null,
    session: data.session,
  };
}

/** Google OAuth — redirect URL must be allowlisted in Supabase Dashboard. */
export async function signInWithGoogle(redirectTo: string): Promise<{
  url: string | null;
  error: AuthError | null;
}> {
  const supabase = await createCookieServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  return { url: data.url, error };
}

/** Email OTP — enable Email provider + OTP in Supabase Auth settings. */
export async function signInWithOtp(email: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const supabase = await createCookieServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: false },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Bearer-token client for membership lookups (legacy dashboard cookies). */
export function createUserAuthClient(accessToken: string) {
  const { url, anonKey } = getPublicSupabaseEnv();
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
