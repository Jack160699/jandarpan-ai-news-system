/**
 * Middleware auth policy — skip Supabase getUser on public traffic.
 * Edge-safe: cookie inspection only, no network calls.
 */

import type { NextRequest } from "next/server";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from "@/lib/saas-auth/cookies";

const ADMIN_PUBLIC = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
];
const DASHBOARD_PUBLIC = ["/dashboard/login"];
const ADMIN_PREFIX = "/admin";
const DASHBOARD_PREFIX = "/dashboard";

const SUPABASE_AUTH_COOKIE_PREFIX = "sb-";
const SUPABASE_AUTH_COOKIE_SUFFIX = "-auth-token";

function isProtectedPrefix(
  pathname: string,
  prefix: string,
  publicPaths: string[]
): boolean {
  if (!pathname.startsWith(prefix)) return false;
  return !publicPaths.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

function isAuthLoginPage(pathname: string): boolean {
  return (
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/") ||
    pathname === "/admin/forgot-password" ||
    pathname.startsWith("/admin/forgot-password/") ||
    pathname === "/admin/reset-password" ||
    pathname.startsWith("/admin/reset-password/") ||
    pathname === "/dashboard/login" ||
    pathname.startsWith("/dashboard/login/")
  );
}

/** True when request carries desk or Supabase session cookies (no network). */
export function hasAuthSessionCookies(request: NextRequest): boolean {
  const names = request.cookies.getAll().map((c) => c.name);
  return (
    names.some(
      (n) =>
        n.startsWith(SUPABASE_AUTH_COOKIE_PREFIX) &&
        n.includes(SUPABASE_AUTH_COOKIE_SUFFIX)
    ) ||
    names.includes(ACCESS_COOKIE) ||
    names.includes(REFRESH_COOKIE)
  );
}

function isReaderAuthCallback(pathname: string): boolean {
  return pathname === "/auth/callback" || pathname.startsWith("/auth/callback/");
}

/**
 * Whether middleware should call updateSupabaseSession (auth.getUser).
 *
 * Public reader pages, SEO routes, and public APIs are excluded.
 * Protected desk pages always validate. Login pages validate only when
 * session cookies are present (redirect already-authenticated users).
 * Reader OAuth callback always refreshes so PKCE cookies land correctly.
 *
 * Authenticated API routes self-validate in route handlers — no duplicate
 * middleware getUser.
 */
export function requiresMiddlewareSupabaseAuth(
  pathname: string,
  request: NextRequest
): boolean {
  if (isReaderAuthCallback(pathname)) {
    return true;
  }

  if (
    isProtectedPrefix(pathname, ADMIN_PREFIX, ADMIN_PUBLIC) ||
    isProtectedPrefix(pathname, DASHBOARD_PREFIX, DASHBOARD_PUBLIC)
  ) {
    return true;
  }

  if (isAuthLoginPage(pathname) && hasAuthSessionCookies(request)) {
    return true;
  }

  return false;
}
