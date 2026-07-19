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
import { permissionsForRole } from "@/lib/newsroom-auth/role-permissions";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import type { AdminSessionResponse } from "@/lib/auth/admin-session-types";
import { ROLE_COOKIE } from "@/lib/security/constants";
import { checkPathRbac } from "@/lib/security/middleware-rbac";
import { logAdminAccessDenied, logAdminSessionMismatch } from "@/lib/security/admin-access-log";
import {
  getDashboardSession,
  setMembershipContextCookies,
} from "@/lib/saas-auth/session";
import { getDefaultTenant } from "@/lib/tenant/registry";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { createCookieServerClient } from "@/lib/supabase/server";
import "@/styles/admin-tokens.css";
import "@/styles/admin-newsroom.css";
import "@/styles/admin-v2.css";
import "@/styles/admin-v3.css";
import "@/styles/admin-v3-editor.css";

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

  const isPublicAuthRoute =
    pathname === "/admin/login" ||
    pathname.startsWith("/admin/login/") ||
    pathname === "/admin/forgot-password" ||
    pathname.startsWith("/admin/forgot-password/") ||
    pathname === "/admin/reset-password" ||
    pathname.startsWith("/admin/reset-password/");

  if (!isPublicAuthRoute && !isProductionDeployment()) {
    const cookieStore = await cookies();
    const e2eUserId = cookieStore.get(E2E_AUTH_COOKIE)?.value;
    const roleCookie = cookieStore.get(ROLE_COOKIE)?.value;
    if (e2eUserId && roleCookie) {
      const tenant = getDefaultTenant();
      const role = normalizeDashboardRole(roleCookie);
      const rbac = checkPathRbac(pathname, role);
      if (!rbac.allowed) {
        void logAdminAccessDenied({
          reason: "route_forbidden",
          resourceType: "admin_route",
          resourceId: pathname,
          pathname,
          cookieRole: roleCookie,
          trustedRole: role,
        });
        return redirect(rbac.redirectTo ?? "/admin/editorial?error=forbidden");
      }
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
  if (!isPublicAuthRoute) {
    const supabase = await createCookieServerClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
    user = authUser;
  }

  let dashboardSession = null;
  if (user) {
    try {
      dashboardSession = await getDashboardSession();
    } catch (err) {
      logAdminSession("layout_session_error", {
        userId: user.id,
        email: user.email,
        error: err instanceof Error ? err.message : "session_load_failed",
      });
    }
  }

  const initialSession = dashboardSession
    ? mapDashboardToAdminSession(dashboardSession)
    : null;

  if (user && !initialSession?.membership?.role) {
    logAdminSession("layout_membership_unresolved", {
      userId: user.id,
      email: user.email,
    });
  }

  if (user && dashboardSession?.membership?.role && !isPublicAuthRoute) {
    const trustedRole = dashboardSession.membership.role;
    const cookieStore = await cookies();
    const roleCookie = cookieStore.get(ROLE_COOKIE)?.value ?? null;
    const cookieRole = roleCookie
      ? normalizeDashboardRole(roleCookie)
      : null;

    if (cookieRole && cookieRole !== trustedRole) {
      await logAdminSessionMismatch({
        session: dashboardSession,
        cookieRole: roleCookie,
        pathname,
      });
      try {
        await setMembershipContextCookies(
          trustedRole,
          dashboardSession.membership.tenantSlug
        );
      } catch {
        /* cookie mutation may be unavailable in some render paths */
      }
    }

    const rbac = checkPathRbac(pathname, trustedRole);
    if (!rbac.allowed) {
      void logAdminAccessDenied({
        reason: "route_forbidden",
        resourceType: "admin_route",
        resourceId: pathname,
        pathname,
        session: dashboardSession,
        cookieRole: roleCookie,
        trustedRole,
      });
      return redirect(rbac.redirectTo ?? "/admin/editorial?error=forbidden");
    }
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
