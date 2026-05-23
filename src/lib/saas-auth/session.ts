/**
 * Dashboard session — Supabase Auth JWT in httpOnly cookies + tenant membership
 */

import { cookies } from "next/headers";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { createUserAuthClient } from "@/lib/supabase/auth";
import { getDefaultTenant, getTenantBySlug } from "@/lib/tenant/registry";
import { isAdminAuthorized } from "@/lib/editorial-dashboard/auth";
import type { DashboardRole, DashboardSession, TenantMembership } from "@/lib/saas-auth/types";

export const ACCESS_COOKIE = "nr-dashboard-access";
export const REFRESH_COOKIE = "nr-dashboard-refresh";

const DEV_USER_ID = "00000000-0000-4000-8000-00000000d001";

async function loadMembership(
  userId: string,
  email: string,
  tenantSlug?: string | null
): Promise<TenantMembership | null> {
  const supabase = createAdminServerClient();

  const { data: memberships, error } = await supabase
    .from("tenant_memberships")
    .select("id, tenant_id, user_id, email, role, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error || !memberships?.length) return null;

  for (const row of memberships) {
    const { data: tenant } = await supabase
      .from("newsroom_tenants")
      .select("slug, config")
      .eq("id", row.tenant_id)
      .maybeSingle();

    if (!tenant) continue;
    if (tenantSlug && tenant.slug !== tenantSlug) continue;

    const config = (tenant.config ?? {}) as {
      branding?: { nameEn?: string };
    };

    return {
      id: row.id,
      tenantId: row.tenant_id,
      tenantSlug: tenant.slug,
      tenantName: config.branding?.nameEn ?? tenant.slug,
      userId: row.user_id,
      email: row.email ?? email,
      role: row.role as DashboardRole,
      status: row.status as TenantMembership["status"],
    };
  }

  return null;
}

function devBypassMembership(tenantSlug?: string | null): TenantMembership {
  const tenant = tenantSlug
    ? getTenantBySlug(tenantSlug) ?? getDefaultTenant()
    : getDefaultTenant();

  return {
    id: "dev-membership",
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    tenantName: tenant.branding.nameEn,
    userId: DEV_USER_ID,
    email: process.env.DASHBOARD_DEV_EMAIL ?? "dev@newsroom.local",
    role: "owner",
    status: "active",
  };
}

export async function getDashboardSession(
  request?: Request
): Promise<DashboardSession | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE)?.value;
  const tenantHint =
    request?.headers.get("x-tenant-slug") ??
    cookieStore.get("nr-tenant-slug")?.value ??
    null;

  if (!isSupabaseConfigured()) {
    if (process.env.NODE_ENV === "development") {
      return {
        userId: DEV_USER_ID,
        email: "dev@newsroom.local",
        accessToken: "dev",
        membership: devBypassMembership(tenantHint),
        isDevBypass: true,
      };
    }
    return null;
  }

  if (!accessToken) {
    const devKey = request
      ? new URL(request.url).searchParams.get("key")
      : null;
    if (
      process.env.NODE_ENV === "development" &&
      isAdminAuthorized(devKey)
    ) {
      return {
        userId: DEV_USER_ID,
        email: process.env.DASHBOARD_DEV_EMAIL ?? "admin@newsroom.local",
        accessToken: "dev-admin",
        membership: devBypassMembership(tenantHint),
        isDevBypass: true,
      };
    }
    return null;
  }

  if (accessToken === "dev" || accessToken === "dev-admin") {
    return {
      userId: DEV_USER_ID,
      email: process.env.DASHBOARD_DEV_EMAIL ?? "dev@newsroom.local",
      accessToken,
      membership: devBypassMembership(tenantHint),
      isDevBypass: true,
    };
  }

  const client = createUserAuthClient(accessToken);
  const { data: userData, error } = await client.auth.getUser();

  if (error || !userData.user) return null;

  const membership = await loadMembership(
    userData.user.id,
    userData.user.email ?? "",
    tenantHint
  );

  if (!membership) {
    if (process.env.NODE_ENV === "development") {
      return {
        userId: userData.user.id,
        email: userData.user.email ?? "dev@newsroom.local",
        accessToken,
        membership: devBypassMembership(tenantHint),
        isDevBypass: true,
      };
    }
    return null;
  }

  return {
    userId: userData.user.id,
    email: userData.user.email ?? membership.email,
    accessToken,
    membership,
    isDevBypass: false,
  };
}

export async function setSessionCookies(
  accessToken: string,
  refreshToken: string
) {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";

  cookieStore.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  cookieStore.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
}
