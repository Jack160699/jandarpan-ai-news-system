/**
 * Emergency admin recovery — OPT-IN ONLY, local development only.
 *
 * Enable when Supabase is down or admin is inaccessible (local dev):
 *   ADMIN_EMERGENCY_MODE=1
 *
 * NEVER enable in production or on Vercel deployments.
 */

import { isProductionDeployment } from "@/lib/infrastructure/production";

export function isAdminEmergencyMode(): boolean {
  if (isProductionDeployment()) return false;
  if (process.env.VERCEL_ENV) return false;
  return process.env.ADMIN_EMERGENCY_MODE === "1";
}

/** Client-side emergency flag is disabled — server auth is authoritative. */
export function isAdminEmergencyModeClient(): boolean {
  return false;
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
