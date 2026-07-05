/**
 * Temporary structured auth diagnostics — enable with AUTH_TRACE=1 or ADMIN_DEBUG=1
 */

import type { AuthError, Session, User } from "@supabase/supabase-js";

export type AuthTraceCookieSummary = {
  total: number;
  names: string[];
  hasSupabaseAuth: boolean;
  hasLegacyAccess: boolean;
  hasLegacyRefresh: boolean;
  hasRoleCookie: boolean;
  hasAuthTenantCookie: boolean;
  hasWhitelabelTenantCookie: boolean;
};

export type AuthTraceSnapshot = {
  phase: string;
  supabaseConfigured: boolean;
  cookies: AuthTraceCookieSummary;
  getUser: {
    userId: string | null;
    email: string | null;
    timedOut: boolean;
    error: string | null;
  };
  getSession: {
    exists: boolean;
    expiresAt: number | null;
    timedOut: boolean;
    error: string | null;
  };
  tenantHints: {
    header: string | null;
    authCookie: string | null;
    whitelabelCookie: string | null;
    used: string | null;
  };
  membership: {
    resolved: boolean;
    tenantSlug: string | null;
    role: string | null;
    timedOut: boolean;
    failureReason: string | null;
  };
  failureStep: string | null;
  failureDetail: string | null;
};

const SUPABASE_AUTH_COOKIE_PREFIX = "sb-";
const SUPABASE_AUTH_COOKIE_SUFFIX = "-auth-token";

function shouldTraceAuth(): boolean {
  return (
    process.env.AUTH_TRACE === "1" ||
    process.env.ADMIN_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_DEBUG === "1"
  );
}

export function summarizeAuthCookies(
  cookies: { name: string; value?: string }[]
): AuthTraceCookieSummary {
  const names = cookies.map((c) => c.name).sort();
  return {
    total: cookies.length,
    names,
    hasSupabaseAuth: names.some(
      (n) => n.startsWith(SUPABASE_AUTH_COOKIE_PREFIX) && n.includes(SUPABASE_AUTH_COOKIE_SUFFIX)
    ),
    hasLegacyAccess: names.includes("nr-dashboard-access"),
    hasLegacyRefresh: names.includes("nr-dashboard-refresh"),
    hasRoleCookie: names.includes("nr-dashboard-role"),
    hasAuthTenantCookie: names.includes("nr-dashboard-tenant"),
    hasWhitelabelTenantCookie: names.includes("nr-tenant-slug"),
  };
}

export function logAuthTrace(snapshot: AuthTraceSnapshot): void {
  if (!shouldTraceAuth()) return;
  console.warn("[admin-auth-trace]", JSON.stringify(snapshot));
}

export function buildAuthTraceSnapshot(
  input: Partial<AuthTraceSnapshot> & Pick<AuthTraceSnapshot, "phase">
): AuthTraceSnapshot {
  return {
    phase: input.phase,
    supabaseConfigured: input.supabaseConfigured ?? false,
    cookies: input.cookies ?? {
      total: 0,
      names: [],
      hasSupabaseAuth: false,
      hasLegacyAccess: false,
      hasLegacyRefresh: false,
      hasRoleCookie: false,
      hasAuthTenantCookie: false,
      hasWhitelabelTenantCookie: false,
    },
    getUser: input.getUser ?? {
      userId: null,
      email: null,
      timedOut: false,
      error: null,
    },
    getSession: input.getSession ?? {
      exists: false,
      expiresAt: null,
      timedOut: false,
      error: null,
    },
    tenantHints: input.tenantHints ?? {
      header: null,
      authCookie: null,
      whitelabelCookie: null,
      used: null,
    },
    membership: input.membership ?? {
      resolved: false,
      tenantSlug: null,
      role: null,
      timedOut: false,
      failureReason: null,
    },
    failureStep: input.failureStep ?? null,
    failureDetail: input.failureDetail ?? null,
  };
}

export function traceGetUserResult(result: {
  user: User | null;
  error: AuthError | null;
  timedOut: boolean;
}) {
  return {
    userId: result.user?.id ?? null,
    email: result.user?.email ?? null,
    timedOut: result.timedOut,
    error: result.error?.message ?? null,
  };
}

export function traceGetSessionResult(result: {
  session: Session | null;
  error: AuthError | null;
  timedOut: boolean;
}) {
  return {
    exists: Boolean(result.session),
    expiresAt: result.session?.expires_at ?? null,
    timedOut: result.timedOut,
    error: result.error?.message ?? null,
  };
}
