/**
 * Local/Playwright-only dashboard session from E2E desk cookies.
 * Hard-disabled on production builds and Vercel runtimes (see isE2eAuthEnabled).
 */

import { cookies } from "next/headers";
import {
  E2E_AUTH_COOKIE,
  isE2eAuthEnabled,
} from "@/lib/auth/session-refresh";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import type { DashboardSession } from "@/lib/saas-auth/types";
import { ROLE_COOKIE } from "@/lib/security/constants";
import { getDefaultTenant } from "@/lib/tenant/registry";

export async function resolveE2eDashboardSession(
  request?: Request
): Promise<DashboardSession | null> {
  if (!isE2eAuthEnabled(request)) return null;

  const cookieStore = await cookies();
  const userId = cookieStore.get(E2E_AUTH_COOKIE)?.value?.trim();
  const roleRaw = cookieStore.get(ROLE_COOKIE)?.value?.trim();
  if (!userId || !roleRaw) return null;

  const role = normalizeDashboardRole(roleRaw);
  const tenant = getDefaultTenant();
  const email = `${role}@e2e.test`;

  return {
    userId,
    email,
    accessToken: "e2e",
    isDevBypass: true,
    membership: {
      id: `e2e-membership-${role}`,
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.branding.nameEn,
      userId,
      email,
      role,
      status: "active",
    },
  };
}
