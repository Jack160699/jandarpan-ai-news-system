import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { mapDashboardToAdminSession } from "@/lib/auth/map-admin-session";
import { logAdminSession } from "@/lib/auth/admin-session-log";
import {
  MAX_SESSION_REFRESH_ATTEMPTS,
  parseRefreshAttempt,
  SESSION_REFRESH_ATTEMPT_PARAM,
  SESSION_REFRESH_NEXT_PARAM,
  SESSION_REFRESH_RATE_LIMIT,
} from "@/lib/auth/session-refresh";
import { syncMembershipCookiesFromSession } from "@/lib/auth/sync-membership-cookies";
import { getDashboardSession } from "@/lib/saas-auth/session";
import { checkRateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { getClientIp } from "@/lib/security/request-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeNextPath(raw: string | null, fallback: string): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return fallback;
  if (raw.includes("://")) return fallback;
  return raw;
}

export async function GET(request: NextRequest) {
  const attempt = parseRefreshAttempt(
    request.nextUrl.searchParams.get(SESSION_REFRESH_ATTEMPT_PARAM)
  );
  const nextPath = safeNextPath(
    request.nextUrl.searchParams.get(SESSION_REFRESH_NEXT_PARAM),
    "/admin/editorial"
  );

  const ip = getClientIp(request);
  const rate = await checkRateLimit(
    `session-refresh:${ip}`,
    SESSION_REFRESH_RATE_LIMIT.maxAttempts,
    SESSION_REFRESH_RATE_LIMIT.windowSec
  );

  if (!rate.allowed) {
    logAdminSession("session_refresh_rate_limited", { ip, attempt });
    return rateLimitResponse(rate.retryAfterSec ?? 60);
  }

  if (attempt > MAX_SESSION_REFRESH_ATTEMPTS) {
    logAdminSession("session_refresh_failed", {
      reason: "max_attempts",
      attempt,
      nextPath,
    });
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("error", "session_recovery_failed");
    login.searchParams.set("next", nextPath);
    return NextResponse.redirect(login);
  }

  const session = await getDashboardSession(request);

  if (!session?.membership?.role) {
    logAdminSession("session_refresh_failed", {
      reason: "membership_unresolved",
      attempt,
    });

    if (attempt >= MAX_SESSION_REFRESH_ATTEMPTS) {
      const login = new URL("/admin/login", request.url);
      login.searchParams.set("error", "session_error");
      login.searchParams.set("next", nextPath);
      return NextResponse.redirect(login);
    }

    const retry = new URL("/api/dashboard/auth/refresh-session", request.url);
    retry.searchParams.set(SESSION_REFRESH_NEXT_PARAM, nextPath);
    retry.searchParams.set(SESSION_REFRESH_ATTEMPT_PARAM, String(attempt + 1));
    return NextResponse.redirect(retry);
  }

  await syncMembershipCookiesFromSession(session);

  const payload = mapDashboardToAdminSession(session);
  if (!payload) {
    logAdminSession("session_refresh_failed", {
      reason: "map_failed",
      attempt,
    });
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("error", "session_error");
    return NextResponse.redirect(login);
  }

  const dest = new URL(nextPath, request.url);
  return NextResponse.redirect(dest);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rate = await checkRateLimit(
    `session-refresh:${ip}`,
    SESSION_REFRESH_RATE_LIMIT.maxAttempts,
    SESSION_REFRESH_RATE_LIMIT.windowSec
  );

  if (!rate.allowed) {
    logAdminSession("session_refresh_rate_limited", { ip });
    return rateLimitResponse(rate.retryAfterSec ?? 60);
  }

  const session = await getDashboardSession(request);

  if (!session?.membership?.role) {
    logAdminSession("session_refresh_failed", { reason: "membership_unresolved" });
    return NextResponse.json(
      { ok: false, error: "session_error", recoverable: true },
      { status: 403 }
    );
  }

  await syncMembershipCookiesFromSession(session);
  const payload = mapDashboardToAdminSession(session);

  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "session_error", recoverable: false },
      { status: 403 }
    );
  }

  return NextResponse.json(payload);
}
