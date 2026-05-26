import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminEmergencyMode, traceAdminEmergency } from "@/lib/admin/emergency-mode";
import { AdminSafeGuard } from "@/components/system/AdminSafeGuard";
import { AdminRuntimeRoot } from "@/providers/AdminRuntimeRoot";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import { createCookieServerClient } from "@/lib/supabase/server";
import "@/styles/admin-newsroom.css";

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

  const isLoginRoute =
    pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  let user = null;
  if (!isLoginRoute) {
    const supabase = await createCookieServerClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      redirect(`/admin/login?next=${encodeURIComponent(pathname)}`);
    }
    user = authUser;
  }

  traceAdminEmergency("LAYOUT_RENDER", "production_shell");
  return (
    <AdminSafeGuard>
      <AdminRuntimeRoot initialUser={user}>{children}</AdminRuntimeRoot>
    </AdminSafeGuard>
  );
}
