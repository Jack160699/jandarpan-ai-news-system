/**
 * Dashboard session — Supabase Auth JWT in httpOnly cookies + tenant membership
 */

import { cookies } from "next/headers";
import {
  createAdminServerClient,
  createCookieServerClient,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { getDefaultTenant, getTenantBySlug } from "@/lib/tenant/registry";
import { bootstrapNewsroomAuth } from "@/lib/newsroom-auth/bootstrap";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import { TENANT_MEMBERSHIP_SESSION_SELECT } from "@/lib/supabase/tenant-membership-columns";
import type { DashboardSession, TenantMembership } from "@/lib/saas-auth/types";
import {
  ROLE_COOKIE,
  TENANT_COOKIE_AUTH,
} from "@/lib/security/constants";
import { secureCookieOptions } from "@/lib/security/cookies";
import { safeGetSession, safeGetUser } from "@/lib/auth/auth-safe";
import {
  buildAuthTraceSnapshot,
  logAuthTrace,
  summarizeAuthCookies,
  traceGetSessionResult,
  traceGetUserResult,
} from "@/lib/auth/auth-trace";
import { logAdminSession } from "@/lib/auth/admin-session-log";
import { traceAdminBoot } from "@/lib/observability/admin-boot";
import { isTimeoutError, withTimeout, withTimeoutFallback } from "@/lib/utils/withTimeout";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/saas-auth/cookies";
import { resolveE2eDashboardSession } from "@/lib/auth/e2e-dashboard-session";

const AUTH_CALL_TIMEOUT_MS = 5_000;
const MEMBERSHIP_TIMEOUT_MS = 4_000;

export { ACCESS_COOKIE, REFRESH_COOKIE };

const DEV_USER_ID = "00000000-0000-4000-8000-00000000d001";

type ActiveMembershipRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string | null;
  role: string;
  status: string;
};

function isProdRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

async function loadMembershipInner(
  userId: string,
  email: string,
  tenantSlug?: string | null
): Promise<TenantMembership | null> {
  const supabase = createAdminServerClient();

  let memberships: ActiveMembershipRow[] | null = null;

  try {
    const { data, error } = await supabase
      .from("tenant_memberships")
      .select(TENANT_MEMBERSHIP_SESSION_SELECT)
      .eq("user_id", userId)
      .eq("status", "active");

    if (error || !data) return null;
    memberships = data as unknown as ActiveMembershipRow[];
  } catch {
    return null;
  }

  if (!memberships?.length) return null;

  let fallback: TenantMembership | null = null;

  for (const row of memberships) {
    const { data: tenant } = await supabase
      .from("newsroom_tenants")
      .select("slug, name, config")
      .eq("id", row.tenant_id)
      .maybeSingle();

    if (!tenant) continue;
    if (row.status === "suspended") continue;

    const config = (tenant.config ?? {}) as {
      branding?: { nameEn?: string };
    };
    const tenantRow = tenant as { slug: string; name?: string | null };

    const membership: TenantMembership = {
      id: row.id,
      tenantId: row.tenant_id,
      tenantSlug: tenantRow.slug,
      tenantName:
        tenantRow.name?.trim() ||
        config.branding?.nameEn ||
        tenantRow.slug,
      userId: row.user_id,
      email: row.email ?? email,
      role: normalizeDashboardRole(row.role),
      status: row.status as TenantMembership["status"],
    };

    if (!tenantSlug || tenant.slug === tenantSlug) {
      return membership;
    }

    if (!fallback) fallback = membership;
  }

  return fallback;
}

async function loadMembership(
  userId: string,
  email: string,
  tenantSlug?: string | null
): Promise<{ membership: TenantMembership | null; timedOut: boolean }> {
  traceAdminBoot("TENANT_LOAD", "membership_lookup");
  let timedOut = false;
  const membership = await withTimeout(loadMembershipInner(userId, email, tenantSlug), {
    label: "WORKSPACE_LOAD",
    timeoutMs: MEMBERSHIP_TIMEOUT_MS,
  }).catch((err) => {
    if (isTimeoutError(err)) {
      timedOut = true;
      return null;
    }
    throw err;
  });
  return { membership, timedOut };
}

function devBypassMembership(tenantSlug?: string | null): TenantMembership {
  const tenant = tenantSlug
    ? getTenantBySlug(tenantSlug) ?? getDefaultTenant()
    : getDefaultTenant();

  return {
    id: "dev-membership",
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.branding.nameEn,
    userId: DEV_USER_ID,
    email: process.env.DASHBOARD_DEV_EMAIL ?? "dev@newsroom.local",
    role: "super_admin",
    status: "active",
  };
}

function resolveAuthTenantHint(
  request: Request | undefined,
  cookieStore: Awaited<ReturnType<typeof cookies>>
): {
  used: string | null;
  header: string | null;
  authCookie: string | null;
  whitelabelCookie: string | null;
} {
  const header = request?.headers.get("x-tenant-slug") ?? null;
  const authCookie = cookieStore.get(TENANT_COOKIE_AUTH)?.value ?? null;
  const whitelabelCookie = cookieStore.get("nr-tenant-slug")?.value ?? null;
  const used = header ?? authCookie ?? null;
  return { used, header, authCookie, whitelabelCookie };
}

export async function getDashboardSession(
  request?: Request
): Promise<DashboardSession | null> {
  const cookieStore = await cookies();
  const cookieSummary = summarizeAuthCookies(cookieStore.getAll());
  const tenantHints = resolveAuthTenantHint(request, cookieStore);
  const tenantHint = tenantHints.used;

  const e2eSession = await resolveE2eDashboardSession(request);
  if (e2eSession) {
    return e2eSession;
  }

  if (!isSupabaseConfigured()) {
    logAuthTrace(
      buildAuthTraceSnapshot({
        phase: "getDashboardSession",
        supabaseConfigured: false,
        cookies: cookieSummary,
        tenantHints,
        failureStep: "supabase_not_configured",
        failureDetail: "isSupabaseConfigured() returned false",
      })
    );
    if (
      process.env.NODE_ENV === "development" &&
      !isProdRuntime() &&
      process.env.DASHBOARD_DEV_BYPASS === "1"
    ) {
      return {
        userId: DEV_USER_ID,
        email: "dev@newsroom.local",
        accessToken: "dev",
        membership: devBypassMembership(tenantHint),
        isDevBypass: true,
      };
    }
    return null;
  }

  traceAdminBoot("AUTH_INIT", "getUser");
  const supabase = await createCookieServerClient();
  const cookieAuth = await safeGetUser(supabase, "AUTH_INIT_getUser");
  const sessionProbe = await safeGetSession(supabase, "AUTH_INIT_getSession");

  const user = cookieAuth.user;
  const timedOut = cookieAuth.timedOut;
  const error = cookieAuth.error;

  if (timedOut || error || !user) {
    logAuthTrace(
      buildAuthTraceSnapshot({
        phase: "getDashboardSession",
        supabaseConfigured: true,
        cookies: cookieSummary,
        tenantHints,
        getUser: traceGetUserResult(cookieAuth),
        getSession: traceGetSessionResult(sessionProbe),
        failureStep: timedOut
          ? "auth_getUser_timeout"
          : error
            ? "auth_getUser_error"
            : "auth_getUser_null",
        failureDetail: timedOut
          ? "safeGetUser timed out in getDashboardSession"
          : error?.message ?? "auth.getUser() returned no user",
      })
    );
    return null;
  }

  const userData = { user };

  let { membership, timedOut: membershipTimedOut } = await loadMembership(
    userData.user.id,
    userData.user.email ?? "",
    tenantHint
  );

  if (!membership && userData.user.email) {
    traceAdminBoot("AUTH_INIT", "bootstrap");
    try {
      await withTimeout(
        bootstrapNewsroomAuth({
          userId: userData.user.id,
          email: userData.user.email,
          tenantSlug: tenantHint ?? undefined,
        }),
        { label: "AUTH_INIT_bootstrap", timeoutMs: AUTH_CALL_TIMEOUT_MS }
      );
    } catch {
      /* bootstrap optional — membership may still exist */
    }
    const retryMembership = await loadMembership(
      userData.user.id,
      userData.user.email,
      tenantHint
    );
    membership = retryMembership.membership;
    membershipTimedOut = membershipTimedOut || retryMembership.timedOut;
  }

  if (!membership) {
    if (membershipTimedOut) {
      console.warn("[MEMBERSHIP_TIMEOUT]", "membership_lookup_timed_out", {
        userId: userData.user.id,
      });
    }
    console.warn("[SESSION_ERROR]", "membership_unresolved", {
      userId: userData.user.id,
      timedOut: membershipTimedOut,
    });
    logAuthTrace(
      buildAuthTraceSnapshot({
        phase: "getDashboardSession",
        supabaseConfigured: true,
        cookies: cookieSummary,
        tenantHints,
        getUser: traceGetUserResult(cookieAuth),
        getSession: traceGetSessionResult(sessionProbe),
        membership: {
          resolved: false,
          tenantSlug: null,
          role: null,
          timedOut: membershipTimedOut,
          failureReason: membershipTimedOut
            ? "membership_lookup_timeout"
            : "membership_unresolved",
        },
        failureStep: membershipTimedOut
          ? "membership_lookup_timeout"
          : "membership_unresolved",
        failureDetail: "Active tenant_memberships row not found for user",
      })
    );
    return null;
  }

  if (tenantHint && membership.tenantSlug !== tenantHint) {
    logAdminSession("session_desync", {
      userId: userData.user.id,
      staleAuthTenantHint: tenantHint,
      resolvedTenant: membership.tenantSlug,
      whitelabelTenantCookie: tenantHints.whitelabelCookie,
    });
    try {
      await setMembershipContextCookies(membership.role, membership.tenantSlug);
    } catch {
      /* route handler may not allow cookie mutation — session route syncs after */
    }
  }

  logAuthTrace(
    buildAuthTraceSnapshot({
      phase: "getDashboardSession",
      supabaseConfigured: true,
      cookies: cookieSummary,
      tenantHints,
      getUser: traceGetUserResult(cookieAuth),
      getSession: traceGetSessionResult(sessionProbe),
      membership: {
        resolved: true,
        tenantSlug: membership.tenantSlug,
        role: membership.role,
        timedOut: false,
        failureReason: null,
      },
    })
  );

  if (process.env.ADMIN_DEBUG === "1") {
    console.log("[SESSION_OK]", "resolved_authenticated_session", {
      userId: userData.user.id,
      tenantSlug: membership.tenantSlug,
    });
  }

  return {
    userId: userData.user.id,
    email: userData.user.email ?? membership.email,
    accessToken: "supabase_cookie",
    membership,
    isDevBypass: false,
  };
}

export async function setMembershipContextCookies(
  role: string,
  tenantSlug: string
) {
  const cookieStore = await cookies();
  const opts = secureCookieOptions(60 * 60 * 24 * 7);

  cookieStore.set(ROLE_COOKIE, role, opts);
  cookieStore.set(TENANT_COOKIE_AUTH, tenantSlug, opts);
}

export async function clearMembershipContextCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ROLE_COOKIE);
  cookieStore.delete(TENANT_COOKIE_AUTH);
}

export async function setSessionCookies(
  accessToken: string,
  refreshToken: string
) {
  const cookieStore = await cookies();
  const accessOpts = secureCookieOptions(60 * 60 * 24 * 7);
  const refreshOpts = secureCookieOptions(60 * 60 * 24 * 30);

  cookieStore.set(ACCESS_COOKIE, accessToken, accessOpts);
  cookieStore.set(REFRESH_COOKIE, refreshToken, refreshOpts);
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete(ROLE_COOKIE);
  cookieStore.delete(TENANT_COOKIE_AUTH);
}
