import { isAdminEmergencyMode } from "@/lib/admin/emergency-mode";

export default function AdminRouteLoading() {
  if (isAdminEmergencyMode()) {
    return null;
  }

  return (
    <div className="admin-safe-guard admin-safe-guard--loading" aria-busy>
      <div className="admin-safe-guard__card">
        <p className="admin-safe-guard__eyebrow">Newsroom</p>
        <p className="admin-safe-guard__message">Starting admin workspace…</p>
      </div>
    </div>
  );
}
