import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  E2E_AUTH_HEADER,
  E2E_AUTH_HEADER_VALUE,
  isE2eAuthEnabled,
  E2E_AUTH_COOKIE,
} from "@/lib/auth/session-refresh";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import { clearMembershipContextCookies, setMembershipContextCookies } from "@/lib/saas-auth/session";
import { secureCookieOptions } from "@/lib/security/cookies";
import { ROLE_COOKIE, TENANT_COOKIE_AUTH } from "@/lib/security/constants";
import { getDefaultTenant } from "@/lib/tenant/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * E2E-only: sets desk auth cookies without Supabase (disabled in production).
 * POST { role: CanonicalRole, userId?: string }
 */
export async function POST(request: NextRequest) {
  if (!isE2eAuthEnabled(request)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  let body: { role?: string; userId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const role = normalizeDashboardRole(body.role ?? "editor");
  const userId = body.userId ?? "e2e-user-0001";
  const tenant = getDefaultTenant();

  await setMembershipContextCookies(role, tenant.slug);

  const response = NextResponse.json({
    ok: true,
    role,
    tenantSlug: tenant.slug,
    userId,
  });

  const opts = secureCookieOptions(60 * 60);
  response.cookies.set(E2E_AUTH_COOKIE, userId, opts);

  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isE2eAuthEnabled(request)) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  await clearMembershipContextCookies();

  const response = NextResponse.json({ ok: true });
  const clear = { ...secureCookieOptions(0), maxAge: 0 };
  response.cookies.set(E2E_AUTH_COOKIE, "", clear);
  response.cookies.set(ROLE_COOKIE, "", clear);
  response.cookies.set(TENANT_COOKIE_AUTH, "", clear);
  return response;
}
