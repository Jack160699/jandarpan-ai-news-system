import { canAccessAdminRoute } from "@/lib/newsroom-auth/rbac";
import {
  canAccessBilling,
  canManageTeam,
  hasResolvedRole,
  type AdminPermissionContext,
} from "@/lib/auth/admin-permissions";
import { allWorkspaceNavHrefs } from "@/lib/admin-platform/workspaces";

export type AdminNavHref = string;

const PRIVILEGED_HREFS = new Set<string>([
  "/admin/team",
  "/admin/schema",
  "/admin/billing",
  "/admin/executive",
]);

export function isPrivilegedAdminNavHref(href: string): boolean {
  return PRIVILEGED_HREFS.has(href);
}

/**
 * Sidebar visibility policy — never infer permissions from fallback roles.
 * Privileged items stay hidden until role is resolved (authReady + role).
 */
export function isAdminNavItemVisible(
  href: string,
  ctx: AdminPermissionContext
): boolean {
  if (isPrivilegedAdminNavHref(href)) {
    if (!hasResolvedRole(ctx)) return false;
    if (href === "/admin/team" || href === "/admin/schema") {
      return canManageTeam(ctx);
    }
    if (href === "/admin/billing" || href === "/admin/executive") {
      return canAccessBilling(ctx);
    }
  }
  if (!hasResolvedRole(ctx)) {
    return !isPrivilegedAdminNavHref(href);
  }
  return canAccessAdminRoute(ctx.role!, href);
}

export function filterAdminNavItems<T extends { href: string }>(
  items: readonly T[],
  ctx: AdminPermissionContext
): T[] {
  return items.filter((item) => isAdminNavItemVisible(item.href, ctx));
}

/** Known workspace hrefs for tests / inventory. */
export function listAdminNavHrefs(): string[] {
  return allWorkspaceNavHrefs();
}
