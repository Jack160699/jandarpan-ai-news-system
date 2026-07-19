/**
 * Admin path RBAC helpers.
 *
 * IMPORTANT: Do not use ROLE_COOKIE as the authorization source in middleware.
 * Call `canAccessAdminRoute` only with a role from the trusted membership session
 * (layout / API guards). Middleware may authenticate presence of a session only.
 */

import { canAccessAdminRoute } from "@/lib/newsroom-auth/rbac";

const ADMIN_PUBLIC = [
  "/admin/login",
  "/admin/forgot-password",
  "/admin/reset-password",
];

export function isAdminPublicPath(pathname: string): boolean {
  return ADMIN_PUBLIC.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export function requiresAdminRbac(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false;
  return !isAdminPublicPath(pathname);
}

/**
 * Server-side path check — `role` must come from trusted membership, never a cookie.
 */
export function checkPathRbac(
  pathname: string,
  role: string
): { allowed: boolean; redirectTo?: string } {
  if (requiresAdminRbac(pathname) && !canAccessAdminRoute(role, pathname)) {
    return { allowed: false, redirectTo: "/admin/editorial?error=forbidden" };
  }

  return { allowed: true };
}

/** Explicit policy: middleware must not authorize from role cookies. */
export function middlewareMayAuthorizeFromRoleCookie(): false {
  return false;
}
