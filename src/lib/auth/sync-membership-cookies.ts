import { cookies } from "next/headers";
import { logAdminSession } from "@/lib/auth/admin-session-log";
import { ROLE_COOKIE, TENANT_COOKIE_AUTH } from "@/lib/security/constants";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import { setMembershipContextCookies } from "@/lib/saas-auth/session";
import type { DashboardSession } from "@/lib/saas-auth/types";

/**
 * Keeps httpOnly role/tenant cookies aligned with resolved membership (SSR + API).
 */
export async function syncMembershipCookiesFromSession(
  session: DashboardSession
): Promise<void> {
  const role = session.membership.role;
  const tenantSlug = session.membership.tenantSlug;

  const cookieStore = await cookies();
  const cookieRole = cookieStore.get(ROLE_COOKIE)?.value;
  const cookieTenant = cookieStore.get(TENANT_COOKIE_AUTH)?.value;

  const normalizedRole = normalizeDashboardRole(role);
  const normalizedCookieRole = cookieRole
    ? normalizeDashboardRole(cookieRole)
    : null;

  if (cookieRole && normalizedCookieRole !== normalizedRole) {
    logAdminSession("session_desync", {
      cookieRole: normalizedCookieRole,
      resolvedRole: normalizedRole,
      userId: session.userId,
    });
  }

  if (cookieTenant && cookieTenant !== tenantSlug) {
    logAdminSession("session_desync", {
      cookieTenant,
      resolvedTenant: tenantSlug,
      userId: session.userId,
      action: "overwrite_auth_tenant_cookie",
    });
  }

  await setMembershipContextCookies(role, tenantSlug);
}
