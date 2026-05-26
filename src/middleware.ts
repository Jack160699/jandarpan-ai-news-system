import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isDebugPath,
  isProductionDeployment,
  isProductionExemptPath,
  isSensitiveDevApiPath,
} from "@/lib/infrastructure/production";
import {
  getTenantByDomain,
  getDefaultTenantSlug,
  getTenantBySlug,
} from "@/lib/tenant/registry";
import { TENANT_COOKIE, TENANT_HEADER } from "@/lib/tenant/resolve";
import { ACCESS_COOKIE } from "@/lib/saas-auth/session";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  INACTIVITY_TIMEOUT_SEC,
  LAST_ACTIVITY_COOKIE,
  ROLE_COOKIE,
} from "@/lib/security/constants";
import { checkPathRbac } from "@/lib/security/middleware-rbac";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import { securityHeaders } from "@/lib/security/headers";
import {
  generateRequestId,
  getRequestIdFromHeaders,
  REQUEST_ID_HEADER,
} from "@/lib/observability/request-id";

const DASHBOARD_PUBLIC = ["/dashboard/login"];
const DASHBOARD_PREFIX = "/dashboard";

const ADMIN_PUBLIC = ["/admin/login"];
const ADMIN_PREFIX = "/admin";

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

function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders())) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";

  const tenant =
    getTenantByDomain(host) ?? getTenantBySlug(getDefaultTenantSlug());

  const requestId =
    getRequestIdFromHeaders(request.headers) ?? generateRequestId();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  if (tenant) {
    requestHeaders.set(TENANT_HEADER, tenant.slug);
  }
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response = applySecurityHeaders(response);

  if (tenant) {
    response.cookies.set(TENANT_COOKIE, tenant.slug, {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  let authUser: { id: string; email?: string } | null = null;

  if (isSupabaseConfigured()) {
    const session = await updateSupabaseSession(request, response);
    response = session.response;
    authUser = session.user;
  }

  const { pathname } = request.nextUrl;

  if (isProductionDeployment() && !isProductionExemptPath(pathname)) {
    if (isDebugPath(pathname) || isSensitiveDevApiPath(pathname)) {
      return new NextResponse(null, { status: 404 });
    }
  }

  const legacyAccess = request.cookies.get(ACCESS_COOKIE)?.value;
  const hasAuth =
    Boolean(authUser?.id) ||
    Boolean(legacyAccess && legacyAccess.length > 20);

  const roleCookie = request.cookies.get(ROLE_COOKIE)?.value;
  const role = roleCookie ? normalizeDashboardRole(roleCookie) : null;

  const lastActivity = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
  const now = Math.floor(Date.now() / 1000);
  if (hasAuth && lastActivity) {
    const last = parseInt(lastActivity, 10);
    if (!Number.isNaN(last) && now - last > INACTIVITY_TIMEOUT_SEC) {
      const loginUrl = pathname.startsWith(ADMIN_PREFIX)
        ? "/admin/login?error=session_timeout"
        : "/dashboard/login?error=session_timeout";
      const redirect = NextResponse.redirect(new URL(loginUrl, request.url));
      redirect.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
      redirect.cookies.set(LAST_ACTIVITY_COOKIE, "", { path: "/", maxAge: 0 });
      return applySecurityHeaders(redirect);
    }
  }

  if (hasAuth) {
    response.cookies.set(LAST_ACTIVITY_COOKIE, String(now), {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: INACTIVITY_TIMEOUT_SEC,
    });
  }

  if (
    pathname === "/admin/login" &&
    hasAuth &&
    request.nextUrl.searchParams.get("error") !== "forbidden"
  ) {
    const dest = request.nextUrl.searchParams.get("next") ?? "/admin/editorial";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  if (isProtectedPrefix(pathname, DASHBOARD_PREFIX, DASHBOARD_PUBLIC) && !hasAuth) {
    const login = new URL("/dashboard/login", request.url);
    login.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(login));
  }

  if (isProtectedPrefix(pathname, ADMIN_PREFIX, ADMIN_PUBLIC) && !hasAuth) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname);
    return applySecurityHeaders(NextResponse.redirect(login));
  }

  if (hasAuth && role) {
    const rbac = checkPathRbac(pathname, role);
    if (!rbac.allowed && rbac.redirectTo) {
      return applySecurityHeaders(
        NextResponse.redirect(new URL(rbac.redirectTo, request.url))
      );
    }
  }

  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
