"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRemountTrace } from "@/hooks/useRemountTrace";
import { usePathname } from "next/navigation";
import { AdminAuthLoading } from "@/components/admin-newsroom/AdminAuthLoading";
import { AdminSessionError } from "@/components/admin-newsroom/AdminSessionError";
import {
  canManageTeam,
  hasPermission,
  hasResolvedRole,
} from "@/lib/auth/admin-permissions";
import { logAdminSession } from "@/lib/auth/admin-session-log";
import type { DashboardPermission } from "@/lib/saas-auth/types";
import { useAdminSession } from "@/providers/AdminSessionProvider";

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
  useRemountTrace("AdminAuthShell", "LAYOUT_REMOUNT");

  const {
    userId,
    role,
    authReady,
    status,
    permissions,
    refreshSession,
  } = useAdminSession();

  const deniedRef = useRef(false);
  const permissionCtx = useMemo(
    () => ({ role, authReady, permissions }),
    [role, authReady, permissions]
  );

  useEffect(() => {
    if (status === "loading") return;
    if (userId) return;
    if (status !== "guest") return;
    const next = encodeURIComponent(pathname);
    window.location.replace(`/admin/login?next=${next}`);
  }, [userId, status, pathname]);

  useEffect(() => {
    if (!hasResolvedRole(permissionCtx) || !userId || deniedRef.current) return;

    if (superAdminOnly && !canManageTeam(permissionCtx)) {
      deniedRef.current = true;
      logAdminSession("super_admin_route_denied", { pathname, role });
      window.location.replace("/admin/editorial?error=forbidden");
      return;
    }

    if (permission && !hasPermission(permissionCtx, permission)) {
      deniedRef.current = true;
      logAdminSession("permission_route_denied", { pathname, permission, role });
      window.location.replace("/admin/editorial?error=forbidden");
    }
  }, [
    authReady,
    userId,
    superAdminOnly,
    permission,
    role,
    permissions,
    pathname,
    permissionCtx,
  ]);

  if (status === "loading") {
    return <AdminAuthLoading />;
  }

  if (status === "session_error" || status === "error") {
    const recoverHref = `/api/dashboard/auth/refresh-session?next=${encodeURIComponent(pathname)}`;
    return (
      <AdminSessionError
        onRetry={() => void refreshSession()}
        recoverHref={recoverHref}
      />
    );
  }

  if (!hasResolvedRole(permissionCtx) || !userId) {
    return <AdminAuthLoading label="Verifying permissions…" />;
  }

  if (superAdminOnly && !canManageTeam(permissionCtx)) {
    return null;
  }

  if (permission && !hasPermission(permissionCtx, permission)) {
    return null;
  }

  return <>{children}</>;
}
