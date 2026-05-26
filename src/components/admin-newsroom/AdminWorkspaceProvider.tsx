"use client";

import { usePathname } from "next/navigation";
import { AdminProvider } from "@/components/admin-newsroom/AdminProvider";
import {
  ADMIN_EMERGENCY_MOCK,
} from "@/lib/admin/emergency-mode";
import { useAdminSession } from "@/providers/AdminSessionProvider";

/**
 * Single AdminProvider + dashboard query for the whole admin runtime.
 * Avoids remounting the dashboard query on every AdminPageGate navigation.
 */
export function AdminWorkspaceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const session = useAdminSession();

  if (pathname.startsWith("/admin/login")) {
    return <>{children}</>;
  }

  if (session.isEmergency) {
    return (
      <AdminProvider
        email={ADMIN_EMERGENCY_MOCK.email}
        role={ADMIN_EMERGENCY_MOCK.role}
        tenantName={ADMIN_EMERGENCY_MOCK.tenantName}
        emergencyMode
      >
        {children}
      </AdminProvider>
    );
  }

  return (
    <AdminProvider authReady={session.authReady}>
      {children}
    </AdminProvider>
  );
}
