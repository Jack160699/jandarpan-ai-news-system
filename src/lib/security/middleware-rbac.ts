/**
 * Edge-safe RBAC path checks for middleware
 */

import { canAccessAdminRoute } from "@/lib/newsroom-auth/rbac";

const ADMIN_PUBLIC = ["/admin/login"];

export function isAdminPublicPath(pathname: string): boolean {
  return ADMIN_PUBLIC.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function requiresAdminRbac(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false;
  return !isAdminPublicPath(pathname);
}

export function checkPathRbac(
  pathname: string,
  role: string
): { allowed: boolean; redirectTo?: string } {
  if (requiresAdminRbac(pathname) && !canAccessAdminRoute(role, pathname)) {
    return { allowed: false, redirectTo: "/admin/login?error=forbidden" };
  }

  return { allowed: true };
}
