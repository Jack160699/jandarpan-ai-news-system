import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminProvider } from "@/components/admin-newsroom/AdminProvider";
import { AdminEmergencyBanner } from "@/components/admin-newsroom/AdminEmergencyBanner";
import { AdminRecoveryCard } from "@/components/admin-newsroom/AdminRecoveryCard";
import {
  ADMIN_EMERGENCY_MOCK,
  isAdminEmergencyMode,
  traceAdminEmergency,
} from "@/lib/admin/emergency-mode";
import { canAccessAdminRoute, isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { traceAdminBoot, traceAdminRecovery } from "@/lib/observability/admin-boot";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { getDashboardSessionSafe } from "@/lib/saas-auth/session-safe";
import type { DashboardPermission } from "@/lib/saas-auth/types";

type AdminPageGateProps = {
  children: React.ReactNode;
  permission?: DashboardPermission;
  superAdminOnly?: boolean;
};

export async function AdminPageGate({
  children,
  permission,
  superAdminOnly,
}: AdminPageGateProps) {
  if (isAdminEmergencyMode()) {
    traceAdminEmergency("ADMIN_ROUTE", "emergency_bypass");
    return (
      <AdminProvider
        email={ADMIN_EMERGENCY_MOCK.email}
        role={ADMIN_EMERGENCY_MOCK.role}
        tenantName={ADMIN_EMERGENCY_MOCK.tenantName}
        emergencyMode
      >
        <AdminEmergencyBanner />
        {children}
      </AdminProvider>
    );
  }

  traceAdminBoot("ADMIN_BOOT", "page_gate_start");

  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") ??
    headersList.get("x-invoke-path") ??
    "/admin/editorial";

  const result = await getDashboardSessionSafe();

  if (!result.ok) {
    traceAdminRecovery(result.reason, { pathname, message: result.message });
    return (
      <AdminRecoveryCard
        title={
          result.reason === "timeout"
            ? "Session timed out"
            : "Session unavailable"
        }
        message={result.message}
        showLogin
        retryHref={pathname}
      />
    );
  }

  const session = result.session;

  if (!session) {
    traceAdminBoot("ADMIN_BOOT", "redirect_login", { pathname });
    redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }

  if (!canAccessAdminRoute(session.membership.role, pathname)) {
    traceAdminRecovery("forbidden_route", {
      pathname,
      role: session.membership.role,
    });
    return (
      <AdminRecoveryCard
        title="Access restricted"
        message="Your role cannot open this section. Contact a super admin for elevated permissions."
        showLogin
        forbidden
      />
    );
  }

  if (
    permission &&
    !roleHasPermission(session.membership.role, permission)
  ) {
    traceAdminRecovery("missing_permission", { permission });
    return (
      <AdminRecoveryCard
        title="Permission required"
        message={`This page needs the “${permission}” permission on your account.`}
        forbidden
      />
    );
  }

  if (superAdminOnly && !isSuperAdmin(session.membership.role)) {
    traceAdminRecovery("super_admin_required");
    return (
      <AdminRecoveryCard
        title="Super admin only"
        message="Team and security settings are limited to super admins."
        forbidden
      />
    );
  }

  traceAdminBoot("ADMIN_BOOT", "ready", {
    role: session.membership.role,
    tenant: session.membership.tenantSlug,
  });

  return (
    <AdminProvider
      email={session.email}
      role={session.membership.role}
      tenantName={session.membership.tenantName}
    >
      {children}
    </AdminProvider>
  );
}
