import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getTenantByDomain,
  getDefaultTenantSlug,
  getTenantBySlug,
} from "@/lib/tenant/registry";
import { TENANT_COOKIE, TENANT_HEADER } from "@/lib/tenant/resolve";
import { updateSupabaseSession } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ACCESS_COOKIE } from "@/lib/saas-auth/session";

const DASHBOARD_PUBLIC = ["/dashboard/login"];
const DASHBOARD_PREFIX = "/dashboard";

function isDashboardProtected(pathname: string): boolean {
  if (!pathname.startsWith(DASHBOARD_PREFIX)) return false;
  return !DASHBOARD_PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function hasDashboardSession(request: NextRequest): boolean {
  const legacy = request.cookies.get(ACCESS_COOKIE)?.value;
  if (legacy) return true;
  return request.cookies.getAll().some((c) => c.name.includes("-auth-token"));
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

  if (isSupabaseConfigured()) {
    const session = await updateSupabaseSession(request, response);
    response = session.response;
  }

  const { pathname } = request.nextUrl;

  if (isDashboardProtected(pathname) && !hasDashboardSession(request)) {
    const login = new URL("/dashboard/login", request.url);
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
