/**
 * Admin command-centre information architecture.
 * Primary workspaces: Command Centre, Editorial, Business, Platform.
 * Account menu only: Team, Settings (+ Sign out in shell).
 * Nav items use tier primary | secondary (More tools).
 */

import type { DashboardPermission, DashboardRole } from "@/lib/saas-auth/types";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";
import { roleHasPermission } from "@/lib/saas-auth/rbac";

export type AdminWorkspaceId =
  | "overview"
  | "editorial"
  | "business"
  | "technical"
  | "team"
  | "settings";

export type AdminNavTier = "primary" | "secondary";

export type AdminNavItem = {
  href: string;
  label: string;
  hint?: string;
  iconKey: string;
  /** Primary sidebar routes vs More tools overflow */
  tier?: AdminNavTier;
};

export type AdminWorkspace = {
  id: AdminWorkspaceId;
  label: string;
  description: string;
  homeHref: string;
  permission: DashboardPermission | "super_admin";
  primary: boolean;
  items: AdminNavItem[];
};

export const ADMIN_WORKSPACES: AdminWorkspace[] = [
  {
    id: "overview",
    label: "Command Centre",
    description: "Cross-company attention",
    homeHref: "/admin/overview",
    permission: "analytics:read",
    primary: true,
    items: [
      {
        href: "/admin/overview",
        label: "Command centre",
        iconKey: "layout",
        tier: "primary",
      },
    ],
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Stories and publishing",
    homeHref: "/admin/editorial",
    permission: "content:read",
    primary: true,
    items: [
      {
        href: "/admin/editorial",
        label: "Editorial Home",
        iconKey: "layout",
        tier: "primary",
      },
      {
        href: "/admin/stories",
        label: "Story Queue",
        iconKey: "book",
        tier: "primary",
      },
      {
        href: "/admin/articles",
        label: "All Stories",
        iconKey: "file",
        tier: "primary",
      },
      {
        href: "/admin/editor",
        label: "Editor",
        iconKey: "pen",
        tier: "primary",
      },
      {
        href: "/admin/live-wire",
        label: "Breaking & Live",
        iconKey: "activity",
        tier: "primary",
      },
      {
        href: "/admin/sources",
        label: "Sources",
        iconKey: "radio",
        tier: "secondary",
      },
      {
        href: "/admin/districts",
        label: "Districts",
        iconKey: "compass",
        tier: "secondary",
      },
      {
        href: "/admin/topics",
        label: "Categories",
        iconKey: "sparkles",
        tier: "secondary",
      },
      {
        href: "/admin/images",
        label: "Images & Media",
        iconKey: "image",
        tier: "secondary",
      },
      {
        href: "/admin/media",
        label: "Media Library",
        iconKey: "images",
        tier: "secondary",
      },
      {
        href: "/admin/workflow",
        label: "Workflow",
        iconKey: "git",
        tier: "secondary",
      },
      {
        href: "/admin/collaboration",
        label: "Collaboration",
        iconKey: "messages",
        tier: "secondary",
      },
      {
        href: "/admin/intelligence",
        label: "Intelligence",
        iconKey: "brain",
        tier: "secondary",
      },
      {
        href: "/admin/ai-copilot",
        label: "AI Copilot",
        iconKey: "bot",
        tier: "secondary",
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    description: "Audience, SEO, revenue",
    homeHref: "/admin/business",
    permission: "analytics:read",
    primary: true,
    items: [
      {
        href: "/admin/business",
        label: "Business Overview",
        iconKey: "chart",
        tier: "primary",
      },
      {
        href: "/admin/analytics",
        label: "Audience",
        iconKey: "line",
        tier: "primary",
      },
      {
        href: "/admin/seo/search-console",
        label: "SEO Hub",
        iconKey: "search",
        tier: "primary",
      },
      {
        href: "/admin/executive",
        label: "Costs",
        iconKey: "landmark",
        tier: "primary",
      },
      {
        href: "/admin/seo/rankings",
        label: "Rankings",
        iconKey: "trending",
        tier: "secondary",
      },
      {
        href: "/admin/seo/competitors",
        label: "Competitors",
        iconKey: "search",
        tier: "secondary",
      },
      {
        href: "/admin/seo/intelligence",
        label: "SEO Intelligence",
        iconKey: "brain",
        tier: "secondary",
      },
      {
        href: "/admin/seo/execution",
        label: "SEO Execution",
        iconKey: "wand",
        tier: "secondary",
      },
      {
        href: "/admin/seo/autonomous",
        label: "Autonomous SEO",
        iconKey: "cpu",
        tier: "secondary",
      },
      {
        href: "/admin/billing",
        label: "Revenue / Billing",
        iconKey: "card",
        tier: "secondary",
      },
    ],
  },
  {
    id: "technical",
    label: "Platform",
    description: "Developer and operations",
    homeHref: "/admin/technical",
    permission: "monitoring:read",
    primary: true,
    items: [
      {
        href: "/admin/technical",
        label: "Platform Overview",
        iconKey: "heart",
        tier: "primary",
      },
      {
        href: "/admin/health",
        label: "Health",
        iconKey: "activity",
        tier: "primary",
      },
      {
        href: "/admin/verified-rates",
        label: "Verified rates",
        iconKey: "activity",
        tier: "secondary",
      },
      {
        href: "/admin/system",
        label: "Pipeline",
        iconKey: "server",
        tier: "primary",
      },
      {
        href: "/admin/ingestion",
        label: "Ingestion",
        iconKey: "database",
        tier: "primary",
      },
      {
        href: "/admin/schema",
        label: "Database",
        iconKey: "database",
        tier: "primary",
      },
    ],
  },
  {
    id: "team",
    label: "Team",
    description: "People and access",
    homeHref: "/admin/team",
    permission: "super_admin",
    primary: false,
    items: [{ href: "/admin/team", label: "Team & access", iconKey: "users", tier: "primary" }],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Platform configuration",
    homeHref: "/admin/settings",
    permission: "editorial:write",
    primary: false,
    items: [
      {
        href: "/admin/settings",
        label: "General",
        iconKey: "settings",
        tier: "primary",
      },
      {
        href: "/admin/settings/organization",
        label: "Organization",
        iconKey: "settings",
        tier: "primary",
      },
    ],
  },
];

export function navItemTier(item: AdminNavItem): AdminNavTier {
  return item.tier ?? "primary";
}

export function primaryNavItems(items: AdminNavItem[]): AdminNavItem[] {
  return items.filter((i) => navItemTier(i) === "primary");
}

export function secondaryNavItems(items: AdminNavItem[]): AdminNavItem[] {
  return items.filter((i) => navItemTier(i) === "secondary");
}

export function moreToolsLabel(workspaceId: AdminWorkspaceId | null | undefined): string {
  switch (workspaceId) {
    case "editorial":
      return "More Editorial Tools";
    case "business":
      return "More Business Tools";
    case "technical":
      return "More Platform Tools";
    default:
      return "More tools";
  }
}

export function workspaceAccessible(
  workspace: AdminWorkspace,
  role: DashboardRole | string | null | undefined
): boolean {
  if (!role) return false;
  if (workspace.permission === "super_admin") {
    return normalizeDashboardRole(String(role)) === "super_admin";
  }
  return roleHasPermission(role, workspace.permission);
}

export function workspacesForRole(
  role: DashboardRole | string | null | undefined
): AdminWorkspace[] {
  return ADMIN_WORKSPACES.filter((ws) => workspaceAccessible(ws, role));
}

export function primaryWorkspacesForRole(
  role: DashboardRole | string | null | undefined
): AdminWorkspace[] {
  return workspacesForRole(role).filter((ws) => ws.primary);
}

export function secondaryWorkspacesForRole(
  role: DashboardRole | string | null | undefined
): AdminWorkspace[] {
  return workspacesForRole(role).filter((ws) => !ws.primary);
}

export function resolveWorkspaceFromPath(pathname: string): AdminWorkspaceId {
  const base = pathname.split("?")[0];
  if (base === "/admin/overview") return "overview";
  if (base === "/admin/executive") return "business";
  if (
    base.startsWith("/admin/seo") ||
    base === "/admin/business" ||
    base === "/admin/analytics" ||
    base === "/admin/billing"
  ) {
    return "business";
  }
  if (
    base === "/admin/technical" ||
    base === "/admin/health" ||
    base === "/admin/system" ||
    base === "/admin/ingestion" ||
    base === "/admin/schema"
  ) {
    return "technical";
  }
  if (base.startsWith("/admin/team")) return "team";
  if (base.startsWith("/admin/settings")) return "settings";
  return "editorial";
}

export function landingPathForRole(role: DashboardRole | string | null | undefined): string {
  const r = normalizeDashboardRole(String(role ?? "journalist"));
  switch (r) {
    case "super_admin":
      return "/admin/overview";
    case "moderator":
      return "/admin/editorial";
    case "editor":
      return "/admin/stories";
    case "journalist":
    default:
      return "/admin/editorial";
  }
}

export function allWorkspaceNavHrefs(): string[] {
  return ADMIN_WORKSPACES.flatMap((ws) => ws.items.map((i) => i.href));
}
