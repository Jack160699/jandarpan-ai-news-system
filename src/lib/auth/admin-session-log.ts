type AdminSessionLogEvent =
  | "missing_membership"
  | "role_resolution_failed"
  | "tenant_mismatch"
  | "session_desync"
  | "layout_membership_unresolved"
  | "layout_session_error"
  | "client_hydration_degraded"
  | "session_error"
  | "session_refresh_failed"
  | "session_refresh_rate_limited"
  | "ssr_csr_role_mismatch"
  | "super_admin_route_denied"
  | "permission_route_denied";

export function logAdminSession(
  event: AdminSessionLogEvent,
  detail: Record<string, unknown>
): void {
  console.warn(`[admin-session] ${event}`, detail);
}
