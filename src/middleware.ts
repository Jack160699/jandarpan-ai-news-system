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
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase/env";

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

export async function middleware(request: NextRequest) {
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";

  const tenant =
    getTenantByDomain(host) ?? getTenantBySlug(getDefaultTenantSlug());

  const requestHeaders = new Headers(request.headers);
  if (tenant) {
    requestHeaders.set(TENANT_HEADER, tenant.slug);
  }
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });

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

  const hasAuth = Boolean(authUser?.id);

  if (isProtectedPrefix(pathname, DASHBOARD_PREFIX, DASHBOARD_PUBLIC) && !hasAuth) {
    const login = new URL("/dashboard/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isProtectedPrefix(pathname, ADMIN_PREFIX, ADMIN_PUBLIC) && !hasAuth) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
