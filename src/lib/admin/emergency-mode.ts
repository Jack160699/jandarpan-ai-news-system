/**
 * Emergency admin recovery — bypass blocking auth/bootstrap.
 *
 * ON by default until you set BOTH to "0":
 *   ADMIN_EMERGENCY_MODE=0
 *   NEXT_PUBLIC_ADMIN_EMERGENCY_MODE=0
 *
 * Progressive restore order: middleware → auth gate → tenant → team → realtime → security sessions
 */

export function isAdminEmergencyMode(): boolean {
  if (process.env.ADMIN_EMERGENCY_MODE === "0") return false;
  if (process.env.NEXT_PUBLIC_ADMIN_EMERGENCY_MODE === "0") return false;
  return true;
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
  tag: "ADMIN_ROUTE" | "LOGIN_RENDER" | "MIDDLEWARE_BYPASS" | "LAYOUT_RENDER" | "CLIENT_HYDRATION",
  detail?: string
): void {
  const msg = detail ? `[${tag}] ${detail}` : `[${tag}]`;
  console.log(msg);
}
