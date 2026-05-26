import type { Metadata } from "next";
import { isAdminEmergencyMode, traceAdminEmergency } from "@/lib/admin/emergency-mode";
import { AdminSafeGuard } from "@/components/system/AdminSafeGuard";
import { AdminRuntimeRoot } from "@/providers/AdminRuntimeRoot";
import { NOINDEX_ROBOTS } from "@/lib/seo";
import "@/styles/admin-newsroom.css";

export const metadata: Metadata = {
  title: "Newsroom Admin",
  robots: NOINDEX_ROBOTS,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (isAdminEmergencyMode()) {
    traceAdminEmergency("LAYOUT_RENDER", "emergency_static_shell");
    return (
      <div className="anr-root anr-root--emergency">
        <AdminRuntimeRoot>{children}</AdminRuntimeRoot>
      </div>
    );
  }

  traceAdminEmergency("LAYOUT_RENDER", "production_shell");
  return (
    <AdminSafeGuard>
      <AdminRuntimeRoot>{children}</AdminRuntimeRoot>
    </AdminSafeGuard>
  );
}
