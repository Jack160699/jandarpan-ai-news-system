import { isAdminEmergencyMode, traceAdminEmergency } from "@/lib/admin/emergency-mode";
import { AdminLoginMinimal } from "./AdminLoginMinimal";
import AdminLoginFullPage from "./AdminLoginFullPage";

type AdminLoginPageProps = {
  searchParams: Promise<{
    error?: string;
    recovery?: string;
    next?: string;
  }>;
};

export default async function AdminLoginPage(props: AdminLoginPageProps) {
  if (isAdminEmergencyMode()) {
    traceAdminEmergency("LOGIN_RENDER", "emergency_minimal");
    return <AdminLoginMinimal />;
  }

  return <AdminLoginFullPage searchParams={props.searchParams} />;
}
