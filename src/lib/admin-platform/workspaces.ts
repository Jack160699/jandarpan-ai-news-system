/**
 * Admin command-centre information architecture.
 * Primary: Command Centre, Editorial, Business, Platform.
 * Secondary: Team, Settings (permission-gated).
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
  hint?: string;
  iconKey: string;
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
      { href: "/admin/overview", label: "Command centre", iconKey: "layout" },
      { href: "/admin/executive", label: "Costs & AI spend", iconKey: "landmark" },
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
      { href: "/admin/editorial", label: "Editorial home", iconKey: "layout" },
      { href: "/admin/stories", label: "Story queue", iconKey: "book" },
      { href: "/admin/articles", label: "All stories", iconKey: "file" },
      { href: "/admin/editor", label: "Editor", iconKey: "pen" },
      { href: "/admin/workflow", label: "Workflow", iconKey: "git" },
      { href: "/admin/live-wire", label: "Breaking & live", iconKey: "activity" },
      { href: "/admin/sources", label: "Sources", iconKey: "radio" },
      { href: "/admin/districts", label: "Districts", iconKey: "compass" },
      { href: "/admin/topics", label: "Categories", iconKey: "sparkles" },
      { href: "/admin/images", label: "Images & media", iconKey: "image" },
      { href: "/admin/media", label: "Media library", iconKey: "images" },
      { href: "/admin/collaboration", label: "Collaboration", iconKey: "messages" },
      { href: "/admin/intelligence", label: "Editorial intelligence", iconKey: "brain" },
      { href: "/admin/ai-copilot", label: "AI Copilot", iconKey: "bot" },
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
      { href: "/admin/business", label: "Business overview", iconKey: "chart" },
      { href: "/admin/analytics", label: "Audience analytics", iconKey: "line" },
      { href: "/admin/seo/search-console", label: "Search Console", iconKey: "search" },
      { href: "/admin/seo/rankings", label: "Rankings", iconKey: "trending" },
      { href: "/admin/seo/competitors", label: "Competitors", iconKey: "search" },
      { href: "/admin/seo/intelligence", label: "SEO intelligence", iconKey: "brain" },
      { href: "/admin/seo/execution", label: "SEO execution", iconKey: "wand" },
      { href: "/admin/seo/autonomous", label: "Autonomous SEO", iconKey: "cpu" },
      { href: "/admin/billing", label: "Revenue", iconKey: "card" },
      { href: "/admin/executive", label: "AI costs & budgets", iconKey: "landmark" },
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
      { href: "/admin/technical", label: "Overall health", iconKey: "heart" },
      { href: "/admin/health", label: "Health details", iconKey: "activity" },
      { href: "/admin/system", label: "Pipeline & workers", iconKey: "server" },
      { href: "/admin/ingestion", label: "Ingestion", iconKey: "database" },
      { href: "/admin/schema", label: "Database & schema", iconKey: "database" },
    ],
  },
  {
    id: "team",
    label: "Team",
    description: "People and access",
    homeHref: "/admin/team",
    permission: "super_admin",
    primary: false,
    items: [{ href: "/admin/team", label: "Team & access", iconKey: "users" }],
  },
  {
    id: "settings",
    label: "Settings",
    description: "Platform configuration",
    homeHref: "/admin/settings",
    permission: "editorial:write",
    primary: false,
    items: [
      { href: "/admin/settings", label: "General", iconKey: "settings" },
      { href: "/admin/settings/organization", label: "Organization", iconKey: "settings" },
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
  if (base === "/admin/overview" || base === "/admin/executive") return "overview";
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
