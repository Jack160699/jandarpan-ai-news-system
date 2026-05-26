/**
 * Emergency admin recovery — OPT-IN ONLY.
 *
 * Enable when Supabase is down or admin is inaccessible:
 *   ADMIN_EMERGENCY_MODE=1
 *   NEXT_PUBLIC_ADMIN_EMERGENCY_MODE=1
 *
 * Disable for normal production (default):
 *   unset both, or set to 0
 */

export function isAdminEmergencyMode(): boolean {
  return (
    process.env.ADMIN_EMERGENCY_MODE === "1" ||
    process.env.NEXT_PUBLIC_ADMIN_EMERGENCY_MODE === "1"
  );
}

export function isAdminEmergencyModeClient(): boolean {
  return process.env.NEXT_PUBLIC_ADMIN_EMERGENCY_MODE === "1";
}

export function isAdminEmergencyPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") || pathname.startsWith("/api/admin")
  );
}

export const ADMIN_EMERGENCY_MOCK = {
  email: "recovery@newsroom.local",
  role: "super_admin" as const,
  tenantName: "Jan Darpan (Recovery Mode)",
};

export function traceAdminEmergency(
  tag:
    | "ADMIN_ROUTE"
    | "LOGIN_RENDER"
    | "MIDDLEWARE_BYPASS"
    | "LAYOUT_RENDER"
    | "CLIENT_HYDRATION",
  detail?: string
): void {
  const msg = detail ? `[${tag}] ${detail}` : `[${tag}]`;
  console.log(msg);
}
