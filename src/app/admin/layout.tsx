import type { Metadata } from "next";
import { isAdminEmergencyMode, traceAdminEmergency } from "@/lib/admin/emergency-mode";
import { AdminSafeGuard } from "@/components/system/AdminSafeGuard";
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
    return <div className="anr-root anr-root--emergency">{children}</div>;
  }

  return <AdminSafeGuard>{children}</AdminSafeGuard>;
}
