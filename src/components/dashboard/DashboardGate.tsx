import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { canAccessDashboardRoute } from "@/lib/saas-auth/rbac";
import { getDashboardSession } from "@/lib/saas-auth/session";

export async function DashboardGate({ children }: { children: React.ReactNode }) {
  const session = await getDashboardSession();

  if (!session) {
    redirect("/dashboard/login");
  }

  const headersList = await headers();
  const pathname =
    headersList.get("x-pathname") ??
    headersList.get("x-invoke-path") ??
    "/dashboard";

  if (!canAccessDashboardRoute(session.membership.role, pathname.split("?")[0])) {
    redirect("/dashboard/login?error=forbidden");
  }

  return <>{children}</>;
}
