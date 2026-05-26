import { AdminAuthShell } from "@/components/admin-newsroom/AdminAuthShell";
import { AdminEmergencyBanner } from "@/components/admin-newsroom/AdminEmergencyBanner";
import {
  isAdminEmergencyMode,
  traceAdminEmergency,
} from "@/lib/admin/emergency-mode";
import type { DashboardPermission } from "@/lib/saas-auth/types";

type AdminPageGateProps = {
  children: React.ReactNode;
  permission?: DashboardPermission;
  superAdminOnly?: boolean;
};

/**
 * Non-blocking gate: renders shell immediately; auth hydrates in AdminAuthShell.
 */
export function AdminPageGate({
  children,
  permission,
  superAdminOnly,
}: AdminPageGateProps) {
  if (isAdminEmergencyMode()) {
    traceAdminEmergency("ADMIN_ROUTE", "emergency_bypass");
    return (
      <>
        <AdminEmergencyBanner />
        {children}
      </>
    );
  }

  return (
    <AdminAuthShell permission={permission} superAdminOnly={superAdminOnly}>
      {children}
    </AdminAuthShell>
  );
}
