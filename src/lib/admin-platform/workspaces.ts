/**
 * Admin command-centre information architecture.
 * Workspaces group routes; primary nav stays short by default.
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

export type AdminNavItem = {
  href: string;
  label: string;
  /** Optional short helper for tooltips */
  hint?: string;
};

export type AdminWorkspace = {
  id: AdminWorkspaceId;
  label: string;
  description: string;
  homeHref: string;
  /** Permission required to see the workspace at all */
  permission: DashboardPermission | "super_admin";
  items: AdminNavItem[];
};

export const ADMIN_WORKSPACES: AdminWorkspace[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Company health at a glance",
    homeHref: "/admin/overview",
    permission: "analytics:read",
    items: [
      { href: "/admin/overview", label: "Command centre" },
      { href: "/admin/executive", label: "Costs & AI spend", hint: "Details" },
    ],
  },
  {
    id: "editorial",
    label: "Editorial",
    description: "Stories, queues, and publishing",
    homeHref: "/admin/editorial",
    permission: "content:read",
    items: [
      { href: "/admin/editorial", label: "Editorial home" },
      { href: "/admin/stories", label: "Story queue" },
      { href: "/admin/articles", label: "All stories" },
      { href: "/admin/editor", label: "Editor" },
      { href: "/admin/workflow", label: "Workflow" },
      { href: "/admin/live-wire", label: "Breaking & live" },
      { href: "/admin/sources", label: "Sources" },
      { href: "/admin/districts", label: "Districts" },
      { href: "/admin/topics", label: "Categories" },
      { href: "/admin/images", label: "Images & media" },
      { href: "/admin/media", label: "Media library" },
      { href: "/admin/collaboration", label: "Collaboration" },
      { href: "/admin/intelligence", label: "Coverage intel" },
      { href: "/admin/ai-copilot", label: "AI Copilot" },
    ],
  },
  {
    id: "business",
    label: "Business",
    description: "Audience, SEO, and revenue",
    homeHref: "/admin/business",
    permission: "analytics:read",
    items: [
      { href: "/admin/business", label: "Business overview" },
      { href: "/admin/analytics", label: "Traffic & audience" },
      { href: "/admin/seo/search-console", label: "SEO" },
      { href: "/admin/seo/rankings", label: "Rankings" },
      { href: "/admin/seo/competitors", label: "Competitors" },
      { href: "/admin/seo/intelligence", label: "SEO intelligence" },
      { href: "/admin/seo/execution", label: "SEO execution" },
      { href: "/admin/seo/autonomous", label: "Autonomous SEO" },
      { href: "/admin/billing", label: "Revenue & billing" },
    ],
  },
  {
    id: "technical",
    label: "Technical",
    description: "Pipeline, workers, and system health",
    homeHref: "/admin/technical",
    permission: "monitoring:read",
    items: [
      { href: "/admin/technical", label: "System health" },
      { href: "/admin/health", label: "Health details" },
      { href: "/admin/system", label: "Pipeline & workers" },
      { href: "/admin/ingestion", label: "Ingestion" },
      { href: "/admin/schema", label: "Database & schema" },
    ],
  },
  {
    id: "team",
    label: "Team",
    description: "People and access",
    homeHref: "/admin/team",
    permission: "super_admin",
    items: [{ href: "/admin/team", label: "Team & access" }],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Platform configuration",
    homeHref: "/admin/settings",
    permission: "editorial:write",
    items: [
      { href: "/admin/settings", label: "General" },
      { href: "/admin/settings/organization", label: "Organization" },
    ],
  },
];

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

export function resolveWorkspaceFromPath(pathname: string): AdminWorkspaceId {
  const base = pathname.split("?")[0];
  if (base === "/admin/overview" || base === "/admin/executive") return "overview";
  if (base.startsWith("/admin/seo") || base === "/admin/business" || base === "/admin/analytics" || base === "/admin/billing") {
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

/**
 * Role-aware landing after login.
 * Maps canonical roles to the most useful first screen.
 */
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

/** Flat list of all nav hrefs (for policy / tests). */
export function allWorkspaceNavHrefs(): string[] {
  return ADMIN_WORKSPACES.flatMap((ws) => ws.items.map((i) => i.href));
}
