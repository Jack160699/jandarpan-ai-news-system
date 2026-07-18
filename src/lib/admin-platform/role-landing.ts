import { landingPathForRole } from "@/lib/admin-platform/workspaces";
import type { DashboardRole } from "@/lib/saas-auth/types";

/** Resolve post-login redirect, honouring an explicit safe `next` path. */
export function resolveAdminLanding(
  role: DashboardRole | string | null | undefined,
  nextParam: string | null | undefined
): string {
  if (nextParam && isSafeAdminNext(nextParam)) {
    return nextParam;
  }
  return landingPathForRole(role);
}

export function isSafeAdminNext(next: string): boolean {
  if (!next.startsWith("/admin")) return false;
  if (next.startsWith("//")) return false;
  if (next.includes("://")) return false;
  if (next.startsWith("/admin/login")) return false;
  return true;
}
