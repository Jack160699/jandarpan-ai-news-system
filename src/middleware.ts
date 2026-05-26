import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  isAdminEmergencyMode,
  isAdminEmergencyPath,
  traceAdminEmergency,
} from "@/lib/admin/emergency-mode";
import {
  isCronPath,
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
import { traceMiddleware } from "@/lib/observability/admin-boot";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ROLE_COOKIE } from "@/lib/security/constants";
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

function redirectWithCookies(
  request: NextRequest,
  pathname: string,
  response: NextResponse
): NextResponse {
  const redirect = NextResponse.redirect(new URL(pathname, request.url));
  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });
  return applySecurityHeaders(redirect);
}

function isIngestionApiPath(pathname: string): boolean {
  if (pathname === "/api/health") return true;
  if (pathname.startsWith("/api/debug/") && isProductionExemptPath(pathname)) {
    return true;
  }
  return (
    isCronPath(pathname) ||
    pathname === "/api/fetch-news" ||
    pathname === "/api/process-ai" ||
    pathname === "/api/generate-articles" ||
    pathname === "/api/process-editorial-images" ||
    pathname === "/api/rss-health"
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ─── Cron / ingestion APIs: skip session + RBAC (auth handled in route) ───
  if (isIngestionApiPath(pathname)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return applySecurityHeaders(response);
  }

  // ─── EMERGENCY: admin routes pass through instantly (no auth / Supabase) ───
  if (isAdminEmergencyMode() && isAdminEmergencyPath(pathname)) {
    traceAdminEmergency("MIDDLEWARE_BYPASS", pathname);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    requestHeaders.set("x-admin-emergency", "1");
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set("x-admin-emergency", "1");
    return applySecurityHeaders(response);
  }

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
  requestHeaders.set("x-pathname", pathname);

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
    if (session.timedOut) {
      traceMiddleware("auth_timed_out", { pathname });
    }
  }

  if (isProductionDeployment() && !isProductionExemptPath(pathname)) {
    if (isDebugPath(pathname) || isSensitiveDevApiPath(pathname)) {
      return new NextResponse(null, { status: 404 });
    }
  }

  const hasAuth = Boolean(authUser?.id);

  const roleCookie = request.cookies.get(ROLE_COOKIE)?.value;
  const role = roleCookie ? normalizeDashboardRole(roleCookie) : null;

  if (pathname === "/admin/login" && hasAuth) {
    const dest = request.nextUrl.searchParams.get("next") ?? "/admin/editorial";
    return redirectWithCookies(request, dest, response);
  }

  if (isProtectedPrefix(pathname, DASHBOARD_PREFIX, DASHBOARD_PUBLIC) && !hasAuth) {
    const login = new URL("/dashboard/login", request.url);
    login.searchParams.set("next", pathname);
    return redirectWithCookies(request, `${login.pathname}${login.search}`, response);
  }

  if (isProtectedPrefix(pathname, ADMIN_PREFIX, ADMIN_PUBLIC) && !hasAuth) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname);
    return redirectWithCookies(request, `${login.pathname}${login.search}`, response);
  }

  if (hasAuth && role) {
    const rbac = checkPathRbac(pathname, role);
    if (!rbac.allowed && rbac.redirectTo) {
      const redirectUrl = new URL(rbac.redirectTo, request.url);
      if (
        redirectUrl.pathname === "/admin/login" &&
        pathname.startsWith(ADMIN_PREFIX) &&
        pathname !== "/admin/login"
      ) {
        redirectUrl.searchParams.set("next", pathname);
      }
      if (redirectUrl.pathname === pathname) {
        return response;
      }
      return redirectWithCookies(
        request,
        `${redirectUrl.pathname}${redirectUrl.search}`,
        response
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
