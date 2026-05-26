"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminProvider } from "@/components/admin-newsroom/AdminProvider";
import { AdminRecoveryCard } from "@/components/admin-newsroom/AdminRecoveryCard";
import { adminAuthController, type AdminSessionPayload } from "@/lib/auth/auth-controller";
import {
  ADMIN_EMERGENCY_MOCK,
  isAdminEmergencyModeClient,
} from "@/lib/admin/emergency-mode";
import { canAccessAdminRoute, isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { traceAdminBoot, traceAdminRecovery } from "@/lib/observability/admin-boot";
import { traceStability } from "@/lib/observability/stability-trace";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import type { DashboardPermission } from "@/lib/saas-auth/types";

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
  const [boot, setBoot] = useState<BootState>("shell");
  const [session, setSession] = useState<AdminSessionPayload | null>(null);

  useEffect(() => {
    if (isAdminEmergencyModeClient()) {
      setBoot("ready");
      setSession({
        ok: true,
        user: { id: "emergency", email: ADMIN_EMERGENCY_MOCK.email },
        membership: {
          role: ADMIN_EMERGENCY_MOCK.role,
          tenantName: ADMIN_EMERGENCY_MOCK.tenantName,
          tenantSlug: "jan-darpan",
          tenantId: "emergency",
        },
      });
      return;
    }

    const controller = new AbortController();
    traceAdminBoot("AUTH_INIT", "client_fetch_start", { pathname });
    traceStability("SESSION_REFRESH", "admin_shell_boot", { pathname });

    (async () => {
      const json = await adminAuthController.getSession({ signal: controller.signal });

      setSession(json);

      if (!json.ok || !json.membership) {
        traceAdminBoot("AUTH_INIT", "guest");
        setBoot(json.error === "timeout" ? "degraded" : "guest");
        return;
      }

      const role = json.membership.role;

      if (!canAccessAdminRoute(role, pathname)) {
        traceAdminRecovery("forbidden_route", { pathname, role });
        setBoot("forbidden");
        return;
      }

      if (permission && !roleHasPermission(role, permission)) {
        traceAdminRecovery("missing_permission", { permission });
        setBoot("forbidden");
        return;
      }

      if (superAdminOnly && !isSuperAdmin(role)) {
        traceAdminRecovery("super_admin_required");
        setBoot("forbidden");
        return;
      }

      traceAdminBoot("AUTH_INIT", "ready", {
        role,
        tenant: json.membership.tenantSlug,
      });
      setBoot("ready");
    })().catch((err) => {
      traceStability("AUTH_LOOP", "admin_shell_boot_error", {
        message: err instanceof Error ? err.message : "unknown",
      });
      setBoot("error");
    });

    return () => controller.abort();
  }, [pathname, permission, superAdminOnly]);

  useEffect(() => {
    if (boot !== "guest") return;
    const next = encodeURIComponent(pathname);
    window.location.replace(`/admin/login?next=${next}`);
  }, [boot, pathname]);

  const identity = useMemo(() => {
    if (session?.user && session.membership) {
      return {
        email: session.user.email,
        role: session.membership.role,
        tenantName: session.membership.tenantName,
      };
    }
    return {
      email: "…",
      role: "editor",
      tenantName: "Newsroom",
    };
  }, [session]);

  const authReady = boot === "ready" || boot === "degraded";

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
    <AdminProvider
      email={identity.email}
      role={identity.role}
      tenantName={identity.tenantName}
      authReady={authReady}
    >
      {boot === "degraded" ? (
        <div className="anr-emergency-banner" role="status">
          <strong>Degraded mode.</strong> Auth verification timed out. Some data
          may be stale — retry or sign in again.
        </div>
      ) : null}
      {children}
    </AdminProvider>
  );
}
