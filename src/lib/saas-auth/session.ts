/**
 * Dashboard session — Supabase Auth JWT in httpOnly cookies + tenant membership
 */

import { cookies } from "next/headers";
import { createAdminServerClient, isSupabaseConfigured } from "@/lib/supabase";
import { createUserAuthClient } from "@/lib/supabase/auth";
import { getDefaultTenant, getTenantBySlug } from "@/lib/tenant/registry";
import { bootstrapNewsroomAuth } from "@/lib/newsroom-auth/bootstrap";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import { TENANT_MEMBERSHIP_SESSION_SELECT } from "@/lib/supabase/tenant-membership-columns";
import type { DashboardSession, TenantMembership } from "@/lib/saas-auth/types";
import {
  ROLE_COOKIE,
  TENANT_COOKIE_AUTH,
} from "@/lib/security/constants";
import { secureCookieOptions } from "@/lib/security/cookies";
import {
  isSessionRevoked,
  touchSecuritySession,
} from "@/lib/security/session-store";

import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/saas-auth/cookies";

export { ACCESS_COOKIE, REFRESH_COOKIE };

const DEV_USER_ID = "00000000-0000-4000-8000-00000000d001";

function isProdRuntime(): boolean {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production"
  );
}

async function loadMembership(
  userId: string,
  email: string,
  tenantSlug?: string | null
): Promise<TenantMembership | null> {
  const supabase = createAdminServerClient();

  let memberships:
    | {
        id: string;
        tenant_id: string;
        user_id: string;
        email: string | null;
        role: string;
        status: string;
      }[]
    | null = null;

  try {
    const { data, error } = await supabase
      .from("tenant_memberships")
      .select(TENANT_MEMBERSHIP_SESSION_SELECT)
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) return null;
    memberships = data as typeof memberships;
  } catch {
    return null;
  }

  if (!memberships?.length) return null;

  let fallback: TenantMembership | null = null;

  for (const row of memberships) {
    const { data: tenant } = await supabase
      .from("newsroom_tenants")
      .select("slug, name, config")
      .eq("id", row.tenant_id)
      .maybeSingle();

    if (!tenant) continue;
    if (row.status === "suspended") continue;

    const config = (tenant.config ?? {}) as {
      branding?: { nameEn?: string };
    };
    const tenantRow = tenant as { slug: string; name?: string | null };

    const membership: TenantMembership = {
      id: row.id,
      tenantId: row.tenant_id,
      tenantSlug: tenantRow.slug,
      tenantName:
        tenantRow.name?.trim() ||
        config.branding?.nameEn ||
        tenantRow.slug,
      userId: row.user_id,
      email: row.email ?? email,
      role: normalizeDashboardRole(row.role),
      status: row.status as TenantMembership["status"],
    };

    if (!tenantSlug || tenant.slug === tenantSlug) {
      return membership;
    }

    if (!fallback) fallback = membership;
  }

  return fallback;
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
    role: "super_admin",
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
    if (process.env.NODE_ENV === "development" && !isProdRuntime()) {
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
    return null;
  }

  if (await isSessionRevoked(accessToken)) {
    return null;
  }

  if (accessToken === "dev" || accessToken === "dev-admin") {
    if (isProdRuntime()) return null;
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

  let membership = await loadMembership(
    userData.user.id,
    userData.user.email ?? "",
    tenantHint
  );

  if (!membership && userData.user.email) {
    await bootstrapNewsroomAuth({
      userId: userData.user.id,
      email: userData.user.email,
      tenantSlug: tenantHint ?? undefined,
    });
    membership = await loadMembership(
      userData.user.id,
      userData.user.email,
      tenantHint
    );
  }

  if (!membership) return null;

  await touchSecuritySession(accessToken);

  return {
    userId: userData.user.id,
    email: userData.user.email ?? membership.email,
    accessToken,
    membership,
    isDevBypass: false,
  };
}

export async function setMembershipContextCookies(
  role: string,
  tenantSlug: string
) {
  const cookieStore = await cookies();
  const opts = secureCookieOptions(60 * 60 * 24 * 7);

  cookieStore.set(ROLE_COOKIE, role, opts);
  cookieStore.set(TENANT_COOKIE_AUTH, tenantSlug, opts);
}

export async function clearMembershipContextCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ROLE_COOKIE);
  cookieStore.delete(TENANT_COOKIE_AUTH);
}

export async function setSessionCookies(
  accessToken: string,
  refreshToken: string
) {
  const cookieStore = await cookies();
  const accessOpts = secureCookieOptions(60 * 60 * 24 * 7);
  const refreshOpts = secureCookieOptions(60 * 60 * 24 * 30);

  cookieStore.set(ACCESS_COOKIE, accessToken, accessOpts);
  cookieStore.set(REFRESH_COOKIE, refreshToken, refreshOpts);
}

export async function clearSessionCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete(ROLE_COOKIE);
  cookieStore.delete(TENANT_COOKIE_AUTH);
}
