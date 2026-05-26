import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminProvider } from "@/components/admin-newsroom/AdminProvider";
import { canAccessAdminRoute, isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { getDashboardSession } from "@/lib/saas-auth/session";
import type { DashboardPermission } from "@/lib/saas-auth/types";

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

  const session = await getDashboardSession();

  if (!session) {
    redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
  }

  if (!canAccessAdminRoute(session.membership.role, pathname)) {
    redirect("/admin/login?error=forbidden");
  }

  if (
    permission &&
    !roleHasPermission(session.membership.role, permission)
  ) {
    redirect("/admin/login?error=forbidden");
  }

  if (superAdminOnly && !isSuperAdmin(session.membership.role)) {
    redirect("/admin/login?error=forbidden");
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
