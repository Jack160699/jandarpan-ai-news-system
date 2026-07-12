import { canAccessAdminRoute } from "@/lib/newsroom-auth/rbac";
import {
  canAccessBilling,
  canManageTeam,
  hasResolvedRole,
  type AdminPermissionContext,
} from "@/lib/auth/admin-permissions";

export type AdminNavHref =
  | "/admin/editorial"
  | "/admin/intelligence"
  | "/admin/ai-copilot"
  | "/admin/seo/competitors"
  | "/admin/seo/intelligence"
  | "/admin/seo/rankings"
  | "/admin/seo/search-console"
  | "/admin/seo/execution"
  | "/admin/seo/autonomous"
  | "/admin/editor"
  | "/admin/workflow"
  | "/admin/collaboration"
  | "/admin/stories"
  | "/admin/articles"
  | "/admin/districts"
  | "/admin/topics"
  | "/admin/sources"
  | "/admin/live-wire"
  | "/admin/health"
  | "/admin/system"
  | "/admin/executive"
  | "/admin/ingestion"
  | "/admin/images"
  | "/admin/media"
  | "/admin/analytics"
  | "/admin/settings"
  | "/admin/billing"
  | "/admin/team"
  | "/admin/schema";

const PRIVILEGED_HREFS = new Set<AdminNavHref>([
  "/admin/team",
  "/admin/schema",
  "/admin/billing",
]);

export function isPrivilegedAdminNavHref(href: string): boolean {
  return PRIVILEGED_HREFS.has(href as AdminNavHref);
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
    if (href === "/admin/billing") {
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
