import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { getPublicSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import { bootstrapNewsroomAuth } from "@/lib/newsroom-auth/bootstrap";
import { touchMembershipLastLogin } from "@/lib/newsroom-auth/team-management";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/saas-auth/session";
import { secureCookieOptions } from "@/lib/security/cookies";
import {
  checkLoginRateLimit,
  isAccountLocked,
  recordLoginFailure,
} from "@/lib/security/brute-force";
import { logLoginEvent, logSecurityAudit } from "@/lib/security/audit";
import { detectSuspiciousLogin } from "@/lib/security/login-monitor";
import {
  deviceFingerprint,
  getClientIp,
  getUserAgent,
} from "@/lib/security/request-context";
import {
  registerDevice,
  registerSecuritySession,
} from "@/lib/security/session-store";
import { mustUse2fa, verify2faForUser } from "@/lib/security/two-factor";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import { ROLE_COOKIE, TENANT_COOKIE_AUTH } from "@/lib/security/constants";
import { rateLimitResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

function applyCookies(response: NextResponse, cookies: CookieToSet[]) {
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, {
      ...secureCookieOptions(
        name === REFRESH_COOKIE ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7
      ),
      ...options,
    });
  }
}

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string; totp?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({
        ok: false,
        error: "configure_supabase",
        message: "Set Supabase env vars and create a tenant membership for login.",
      });
    }
    return NextResponse.json({ ok: false, error: "auth_unavailable" }, { status: 503 });
  }

  const email = body.email?.trim();
  const password = body.password;
  const totp = body.totp?.trim();
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const fingerprint = deviceFingerprint(request);

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "email_password_required" },
      { status: 400 }
    );
  }

  if (await isAccountLocked(email)) {
    return NextResponse.json(
      { ok: false, error: "account_locked", retryAfterSec: 3600 },
      { status: 423 }
    );
  }

  const rate = await checkLoginRateLimit(email, ip);
  if (!rate.allowed) {
    return rateLimitResponse(rate.retryAfterSec ?? 900);
  }

  const pendingCookies: CookieToSet[] = [];
  const { url, anonKey } = getPublicSupabaseEnv();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          pendingCookies.push({
            name: cookie.name,
            value: cookie.value,
            options: cookie.options,
          });
        }
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    const fail = await recordLoginFailure(email, ip, userAgent, error?.message ?? "login_failed");
    return NextResponse.json(
      {
        ok: false,
        error: fail.locked ? "account_locked" : (error?.message ?? "login_failed"),
      },
      { status: fail.locked ? 423 : 401 }
    );
  }

  const bootstrap = await bootstrapNewsroomAuth({
    userId: data.user.id,
    email: data.user.email ?? email,
  });

  const memberRole = bootstrap.ok
    ? normalizeDashboardRole(bootstrap.role ?? "journalist")
    : "journalist";
  const needs2fa = await mustUse2fa(data.user.id, memberRole);
  if (needs2fa) {
    if (!totp) {
      return NextResponse.json(
        { ok: false, error: "2fa_required", requires2fa: true },
        { status: 401 }
      );
    }
    const valid = await verify2faForUser(data.user.id, totp);
    if (!valid) {
      await logLoginEvent({
        userId: data.user.id,
        email,
        eventType: "2fa_challenge_failure",
        ipAddress: ip,
        userAgent,
        deviceFingerprint: fingerprint,
      });
      return NextResponse.json({ ok: false, error: "invalid_2fa" }, { status: 401 });
    }
    await logLoginEvent({
      userId: data.user.id,
      email,
      eventType: "2fa_challenge_success",
      ipAddress: ip,
      userAgent,
      deviceFingerprint: fingerprint,
    });
  }

  if (bootstrap.ok && bootstrap.tenantId) {
    await touchMembershipLastLogin(data.user.id, bootstrap.tenantId);
  }

  await registerSecuritySession({
    userId: data.user.id,
    tenantId: bootstrap.tenantId,
    accessToken: data.session.access_token,
    ipAddress: ip,
    userAgent,
    deviceFingerprint: fingerprint,
  });

  await registerDevice({
    userId: data.user.id,
    deviceFingerprint: fingerprint,
    userAgent,
  });

  const suspicious = await detectSuspiciousLogin({
    userId: data.user.id,
    email: data.user.email ?? email,
    ip,
    deviceFingerprint: fingerprint,
    tenantId: bootstrap.tenantId,
  });

  await logLoginEvent({
    userId: data.user.id,
    email: data.user.email ?? email,
    tenantId: bootstrap.tenantId,
    eventType: "login_success",
    ipAddress: ip,
    userAgent,
    deviceFingerprint: fingerprint,
    metadata: suspicious.suspicious ? { suspicious: suspicious.reasons } : {},
  });

  await logSecurityAudit({
    tenantId: bootstrap.tenantId,
    actorUserId: data.user.id,
    actorEmail: data.user.email ?? email,
    action: "auth.login",
    ipAddress: ip,
    userAgent,
    metadata: { suspicious: suspicious.suspicious },
  });

  const response = NextResponse.json({
    ok: true,
    email: data.user.email,
    userId: data.user.id,
    membership: bootstrap.ok
      ? {
          tenantId: bootstrap.tenantId,
          tenantSlug: bootstrap.tenantSlug,
          role: bootstrap.role,
        }
      : null,
    bootstrapError: bootstrap.ok ? undefined : bootstrap.error,
    suspiciousLogin: suspicious.suspicious,
  });

  applyCookies(response, pendingCookies);
  applyCookies(response, [
    {
      name: ACCESS_COOKIE,
      value: data.session.access_token,
      options: { maxAge: 60 * 60 * 24 * 7 },
    },
    {
      name: REFRESH_COOKIE,
      value: data.session.refresh_token,
      options: { maxAge: 60 * 60 * 24 * 30 },
    },
  ]);

  if (bootstrap.ok && bootstrap.role && bootstrap.tenantSlug) {
    const roleOpts = secureCookieOptions(60 * 60 * 24 * 7);
    response.cookies.set(ROLE_COOKIE, bootstrap.role, roleOpts);
    response.cookies.set(TENANT_COOKIE_AUTH, bootstrap.tenantSlug, roleOpts);
  }

  return response;
}
