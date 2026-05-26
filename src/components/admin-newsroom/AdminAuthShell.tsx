"use client";

import { useEffect } from "react";
import { useRemountTrace } from "@/hooks/useRemountTrace";
import { usePathname } from "next/navigation";
import type { DashboardPermission } from "@/lib/saas-auth/types";
import { useAdminSession } from "@/providers/AdminSessionProvider";

type AdminAuthShellProps = {
  children: React.ReactNode;
  permission?: DashboardPermission;
  superAdminOnly?: boolean;
};

export function AdminAuthShell({
  children,
  permission: _permission,
  superAdminOnly: _superAdminOnly,
}: AdminAuthShellProps) {
  void _permission;
  void _superAdminOnly;
  const pathname = usePathname() ?? "/admin/editorial";
  useRemountTrace("AdminAuthShell", "LAYOUT_REMOUNT");

  const { userId } = useAdminSession();

  useEffect(() => {
    if (userId) return;
    const next = encodeURIComponent(pathname);
    window.location.replace(`/admin/login?next=${next}`);
  }, [userId, pathname]);

  if (!userId) return null;
  return <>{children}</>;
}
