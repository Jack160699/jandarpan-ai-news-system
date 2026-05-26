import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/types";
import { getPublicSupabaseEnv, isSupabaseConfigured } from "@/lib/supabase/env";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  clearMembershipContextCookies,
} from "@/lib/saas-auth/session";
import { secureCookieOptions } from "@/lib/security/cookies";
import { logLoginEvent, logSecurityAudit } from "@/lib/security/audit";
import { revokeSession } from "@/lib/security/session-store";
import {
  getClientIp,
  getUserAgent,
} from "@/lib/security/request-context";
import { LAST_ACTIVITY_COOKIE } from "@/lib/security/constants";
import { createUserAuthClient } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const userAgent = getUserAgent(request);
  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;

  let userId: string | null = null;
  let email: string | null = null;

  if (accessToken && accessToken !== "dev" && isSupabaseConfigured()) {
    const client = createUserAuthClient(accessToken);
    const { data } = await client.auth.getUser();
    userId = data.user?.id ?? null;
    email = data.user?.email ?? null;
    await revokeSession(accessToken, "logout");
  }

  const response = NextResponse.json({ ok: true });
  const clearOpts = { ...secureCookieOptions(0), maxAge: 0 };

  response.cookies.set(ACCESS_COOKIE, "", clearOpts);
  response.cookies.set(REFRESH_COOKIE, "", clearOpts);
  response.cookies.set(LAST_ACTIVITY_COOKIE, "", clearOpts);
  response.cookies.set("nr-dashboard-role", "", clearOpts);
  response.cookies.set("nr-dashboard-tenant", "", clearOpts);

  await clearMembershipContextCookies();

  if (isSupabaseConfigured()) {
    const pending: { name: string; value: string }[] = [];
    const { url, anonKey } = getPublicSupabaseEnv();

    const supabase = createServerClient<Database>(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const c of cookiesToSet) {
            pending.push({ name: c.name, value: c.value });
          }
        },
      },
    });

    await supabase.auth.signOut();

    for (const c of pending) {
      response.cookies.set(c.name, c.value, clearOpts);
    }
  }

  await logLoginEvent({
    userId,
    email,
    eventType: "logout",
    ipAddress: ip,
    userAgent,
  });

  await logSecurityAudit({
    actorUserId: userId,
    actorEmail: email,
    action: "auth.logout",
    ipAddress: ip,
    userAgent,
  });

  return response;
}
