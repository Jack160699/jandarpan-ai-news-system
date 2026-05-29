import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminEmergencyMode, traceAdminEmergency } from "@/lib/admin/emergency-mode";
import { AdminSafeGuard } from "@/components/system/AdminSafeGuard";
import { AdminRuntimeRoot } from "@/providers/AdminRuntimeRoot";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import { logAdminSession } from "@/lib/auth/admin-session-log";
import { mapDashboardToAdminSession } from "@/lib/auth/map-admin-session";
import { E2E_AUTH_COOKIE } from "@/lib/auth/session-refresh";
import { isProductionDeployment } from "@/lib/infrastructure/production";
import { syncMembershipCookiesFromSession } from "@/lib/auth/sync-membership-cookies";
import { permissionsForRole } from "@/lib/newsroom-auth/role-permissions";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import { getDashboardSession } from "@/lib/saas-auth/session";
import type { AdminSessionResponse } from "@/lib/auth/admin-session-types";
import { ROLE_COOKIE, TENANT_COOKIE_AUTH } from "@/lib/security/constants";
import { getDefaultTenant } from "@/lib/tenant/registry";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createCookieServerClient } from "@/lib/supabase/server";
import "@/styles/admin-newsroom.css";
import "@/styles/platform-settings.css";

export const metadata: Metadata = {
  title: "Newsroom Admin",
  robots: NOINDEX_ROBOTS,
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-pathname") ?? "/admin";

  if (isAdminEmergencyMode()) {
    traceAdminEmergency("LAYOUT_RENDER", "emergency_static_shell");
    return (
      <div className="anr-root anr-root--emergency">
        <AdminRuntimeRoot initialUser={null}>{children}</AdminRuntimeRoot>
      </div>
    );
  }

  const isLoginRoute =
    pathname === "/admin/login" || pathname.startsWith("/admin/login/");

  if (!isLoginRoute && !isProductionDeployment()) {
    const cookieStore = await cookies();
    const e2eUserId = cookieStore.get(E2E_AUTH_COOKIE)?.value;
    const roleCookie = cookieStore.get(ROLE_COOKIE)?.value;
    if (e2eUserId && roleCookie) {
      const tenant = getDefaultTenant();
      const role = normalizeDashboardRole(roleCookie);
      const e2eSession: AdminSessionResponse = {
        ok: true,
        user: { id: e2eUserId, email: "e2e@newsroom.test" },
        membership: {
          id: "e2e-membership",
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          tenantName: tenant.branding.nameEn,
          userId: e2eUserId,
          email: "e2e@newsroom.test",
          role,
          status: "active",
        },
        permissions: permissionsForRole(role),
      };
      return (
        <AdminSafeGuard>
          <AdminRuntimeRoot
            initialUser={
              { id: e2eUserId, email: "e2e@newsroom.test" } as User
            }
            initialSession={e2eSession}
          >
            {children}
          </AdminRuntimeRoot>
        </AdminSafeGuard>
      );
    }
  }

  let user = null;
  if (!isLoginRoute) {
    const supabase = await createCookieServerClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
    user = authUser;
  }

  const dashboardSession = user ? await getDashboardSession() : null;
  const initialSession = dashboardSession
    ? mapDashboardToAdminSession(dashboardSession)
    : null;

  if (dashboardSession?.membership?.role) {
    await syncMembershipCookiesFromSession(dashboardSession);
  }

  if (user && !initialSession?.membership?.role) {
    logAdminSession("layout_membership_unresolved", {
      userId: user.id,
      email: user.email,
    });
  }

  traceAdminEmergency("LAYOUT_RENDER", "production_shell");
  return (
    <AdminSafeGuard>
      <AdminRuntimeRoot initialUser={user} initialSession={initialSession}>
        {children}
      </AdminRuntimeRoot>
    </AdminSafeGuard>
  );
}
