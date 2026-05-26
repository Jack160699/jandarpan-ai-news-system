import { isAdminEmergencyMode, traceAdminEmergency } from "@/lib/admin/emergency-mode";
import { AdminLoginMinimal } from "./AdminLoginMinimal";
import { AdminLoginForm } from "./AdminLoginForm";

/**
 * Login renders synchronously — no server session probe (avoids bootstrap deadlock).
 * AdminLoginForm checks session client-side with timeout after paint.
 */
export default function AdminLoginPage() {
  if (isAdminEmergencyMode()) {
    traceAdminEmergency("LOGIN_RENDER", "emergency_minimal");
    return <AdminLoginMinimal />;
  }

  traceAdminEmergency("LOGIN_RENDER", "production_form");
  return <AdminLoginForm />;
}
