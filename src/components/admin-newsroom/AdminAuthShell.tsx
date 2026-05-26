"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { AdminProvider } from "@/components/admin-newsroom/AdminProvider";
import { AdminRecoveryCard } from "@/components/admin-newsroom/AdminRecoveryCard";
import { canAccessAdminRoute, isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { traceAdminBoot, traceAdminRecovery } from "@/lib/observability/admin-boot";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import type { DashboardPermission } from "@/lib/saas-auth/types";
import { useAdminSession } from "@/providers/AdminSessionProvider";

type BootState =
  | "shell"
  | "ready"
  | "guest"
  | "forbidden"
  | "degraded"
  | "error";

type AdminAuthShellProps = {
  children: React.ReactNode;
  permission?: DashboardPermission;
  superAdminOnly?: boolean;
};

export function AdminAuthShell({
  children,
  permission,
  superAdminOnly,
}: AdminAuthShellProps) {
  const pathname = usePathname() ?? "/admin/editorial";
  const {
    status,
    authReady,
    isDegraded,
    email,
    role,
    tenantName,
    session,
    refreshSession,
  } = useAdminSession();

  const boot = useMemo((): BootState => {
    if (status === "loading") return "shell";
    if (status === "error") return "error";
    if (status === "degraded") return "degraded";
    if (status === "guest") return "guest";

    const membership = session?.membership;
    if (!membership) return "guest";

    if (!canAccessAdminRoute(membership.role, pathname)) {
      traceAdminRecovery("forbidden_route", { pathname, role: membership.role });
      return "forbidden";
    }
    if (permission && !roleHasPermission(membership.role, permission)) {
      traceAdminRecovery("missing_permission", { permission });
      return "forbidden";
    }
    if (superAdminOnly && !isSuperAdmin(membership.role)) {
      traceAdminRecovery("super_admin_required");
      return "forbidden";
    }

    traceAdminBoot("AUTH_INIT", "ready", {
      role: membership.role,
      tenant: membership.tenantSlug,
    });
    return "ready";
  }, [status, session, pathname, permission, superAdminOnly]);

  useEffect(() => {
    if (boot !== "guest") return;
    const next = encodeURIComponent(pathname);
    window.location.replace(`/admin/login?next=${next}`);
  }, [boot, pathname]);

  if (boot === "forbidden") {
    return (
      <AdminRecoveryCard
        title="Access restricted"
        message="Your role cannot open this section. Contact a super admin if you need access."
        showLogin
        forbidden
        retryHref={pathname}
      />
    );
  }

  if (boot === "error") {
    return (
      <AdminRecoveryCard
        title="Session unavailable"
        message="We could not verify your newsroom session. Try signing in again."
        showLogin
        retryHref={pathname}
      />
    );
  }

  return (
    <AdminProvider email={email} role={role} tenantName={tenantName} authReady={authReady}>
      {isDegraded ? (
        <div className="anr-emergency-banner" role="status">
          <strong>Degraded mode.</strong> Auth verification timed out. Some data may be
          stale —{" "}
          <button type="button" className="anr-link-btn" onClick={() => void refreshSession()}>
            retry session
          </button>{" "}
          or sign in again.
        </div>
      ) : null}
      {children}
    </AdminProvider>
  );
}
