import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminProvider } from "@/components/admin-newsroom/AdminProvider";
import { canAccessAdminRoute } from "@/lib/newsroom-auth/rbac";
import { roleHasPermission } from "@/lib/saas-auth/rbac";
import { getDashboardSession } from "@/lib/saas-auth/session";
import type { DashboardPermission } from "@/lib/saas-auth/types";

type AdminPageGateProps = {
  children: React.ReactNode;
  permission?: DashboardPermission;
};

export async function AdminPageGate({
  children,
  permission,
}: AdminPageGateProps) {
  const session = await getDashboardSession();

  if (!session) {
    redirect("/admin/login");
  }

  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") ??
    headersList.get("x-invoke-path") ??
    "/admin/editorial";

  if (!canAccessAdminRoute(session.membership.role, pathname)) {
    redirect("/admin/login?error=forbidden");
  }

  if (
    permission &&
    !roleHasPermission(session.membership.role, permission)
  ) {
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
