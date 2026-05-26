import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminProvider } from "@/components/admin-newsroom/AdminProvider";
import { AdminRecoveryCard } from "@/components/admin-newsroom/AdminRecoveryCard";
import { canAccessAdminRoute, isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { createLogger } from "@/lib/observability/logger";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { getDashboardSession } from "@/lib/saas-auth/session";
import type { DashboardPermission } from "@/lib/saas-auth/types";

const log = createLogger("admin-page-gate");

type AdminPageGateProps = {
  children: React.ReactNode;
  permission?: DashboardPermission;
  /** Restrict route to super_admin (e.g. /admin/team) */
  superAdminOnly?: boolean;
};

export async function AdminPageGate({
  children,
  permission,
  superAdminOnly,
}: AdminPageGateProps) {
  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") ??
    headersList.get("x-invoke-path") ??
    "/admin/editorial";

  let session: Awaited<ReturnType<typeof getDashboardSession>> = null;

  try {
    session = await getDashboardSession();
  } catch (err) {
    log.error("session_load_failed", {
      err,
      pathname,
    });
    return (
      <AdminRecoveryCard
        title="Session unavailable"
        message="We could not verify your newsroom session. Sign in again or retry in a moment."
        showLogin
      />
    );
  }

  if (!session) {
    redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }

  if (!canAccessAdminRoute(session.membership.role, pathname)) {
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
    return (
      <AdminRecoveryCard
        title="Permission required"
        message={`This page needs the “${permission}” permission on your account.`}
        forbidden
      />
    );
  }

  if (superAdminOnly && !isSuperAdmin(session.membership.role)) {
    return (
      <AdminRecoveryCard
        title="Super admin only"
        message="Team and security settings are limited to super admins."
        forbidden
      />
    );
  }

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
