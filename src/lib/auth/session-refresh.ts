/**
 * Session recovery — shared constants and helpers (edge + Node safe).
 */

export const REFRESH_SESSION_PATH = "/api/dashboard/auth/refresh-session";

export const SESSION_REFRESH_ATTEMPT_PARAM = "attempt";

export const SESSION_REFRESH_NEXT_PARAM = "next";

/** Max recovery redirects before forcing re-login */
export const MAX_SESSION_REFRESH_ATTEMPTS = 3;

export const SESSION_REFRESH_RATE_LIMIT = { maxAttempts: 15, windowSec: 60 };

export const E2E_AUTH_COOKIE = "nr-e2e-user";

export function isRefreshSessionPath(pathname: string): boolean {
  return (
    pathname === REFRESH_SESSION_PATH ||
    pathname.startsWith(`${REFRESH_SESSION_PATH}/`)
  );
}

export function isAuthApiExemptPath(pathname: string): boolean {
  return (
    isRefreshSessionPath(pathname) ||
    pathname === "/api/dashboard/auth/session" ||
    pathname === "/api/dashboard/auth/login" ||
    pathname === "/api/dashboard/auth/logout"
  );
}

export function parseRefreshAttempt(
  value: string | null | undefined
): number {
  const n = parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export function buildRefreshSessionUrl(
  origin: string,
  nextPath: string,
  attempt: number
): string {
  const url = new URL(REFRESH_SESSION_PATH, origin);
  url.searchParams.set(SESSION_REFRESH_NEXT_PARAM, nextPath);
  url.searchParams.set(SESSION_REFRESH_ATTEMPT_PARAM, String(attempt));
  return `${url.pathname}${url.search}`;
}

const E2E_AUTH_HEADER = "x-e2e-auth";
const E2E_AUTH_HEADER_VALUE = "playwright-local";

/**
 * Local Playwright desk auth only.
 * Never enable on production builds or Vercel production.
 * Explicit ENABLE_E2E_AUTH=1 wins even when `.env.local` contains pulled VERCEL=1.
 * Header opt-in is local-only (blocked when VERCEL=1 without ENABLE_E2E_AUTH).
 */
function envFlag(name: string): string {
  return (process.env[name] ?? "")
    .trim()
    .replace(/^['"]|['"]$/g, "");
}

export function isE2eAuthEnabled(request?: Request): boolean {
  const nodeEnv = envFlag("NODE_ENV");
  const vercelEnv = envFlag("VERCEL_ENV");
  if (nodeEnv === "production") return false;
  if (vercelEnv === "production") return false;

  if (envFlag("ENABLE_E2E_AUTH") === "1") return true;

  // Pulled Vercel project env often sets VERCEL=1 / VERCEL="1".
  if (envFlag("VERCEL") === "1") return false;

  if (request?.headers.get(E2E_AUTH_HEADER) === E2E_AUTH_HEADER_VALUE) {
    return true;
  }

  return false;
}

export { E2E_AUTH_HEADER, E2E_AUTH_HEADER_VALUE };
