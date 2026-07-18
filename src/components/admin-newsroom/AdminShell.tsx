"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  Moon,
  Search,
  Sun,
  UserCircle2,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { useHydrationSafe } from "@/hooks/useHydrationSafe";
import { resetAdminQueryClient } from "@/lib/query/query-client";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import { AdminAuthLoading } from "@/components/admin-newsroom/AdminAuthLoading";
import {
  resolveWorkspaceFromPath,
  workspacesForRole,
  type AdminWorkspaceId,
} from "@/lib/admin-platform/workspaces";
import { canAccessAdminRoute, isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { hasResolvedRole } from "@/lib/auth/admin-permissions";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Hide the page header chrome when the page provides its own */
  hidePageHeader?: boolean;
};

export function AdminShell({
  title,
  subtitle,
  children,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  hidePageHeader = false,
}: AdminShellProps) {
  const pathname = usePathname();
  const {
    email,
    role,
    tenantName,
    data,
    theme,
    setTheme,
    toast,
    roleResolved,
  } = useAdminNewsroom();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const search = searchValue ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;

  useHydrationSafe("admin_shell");

  async function signOut() {
    await fetch("/api/dashboard/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    resetAdminQueryClient();
    window.location.assign("/admin/login");
  }

  const canonicalRole = role ? normalizeDashboardRole(String(role)) : null;

  const availableWorkspaces = useMemo(() => {
    if (!roleResolved || !canonicalRole) return [];
    return workspacesForRole(canonicalRole).filter((ws) => {
      if (ws.permission === "super_admin") {
        return isSuperAdmin(canonicalRole);
      }
      return (
        canAccessAdminRoute(canonicalRole, ws.homeHref) ||
        ws.items.some((item) => canAccessAdminRoute(canonicalRole, item.href))
      );
    });
  }, [canonicalRole, roleResolved]);

  const activeWorkspaceId: AdminWorkspaceId = resolveWorkspaceFromPath(pathname);
  const activeWorkspace =
    availableWorkspaces.find((w) => w.id === activeWorkspaceId) ??
    availableWorkspaces[0] ??
    null;

  const visibleItems = useMemo(() => {
    if (!activeWorkspace || !roleResolved || !canonicalRole) return [];
    return activeWorkspace.items.filter((item) => {
      if (item.href === "/admin/team" || item.href === "/admin/schema") {
        return hasResolvedRole({ role: canonicalRole, authReady: roleResolved }) && isSuperAdmin(canonicalRole);
      }
      if (item.href === "/admin/billing") {
        return canAccessAdminRoute(canonicalRole, item.href);
      }
      return canAccessAdminRoute(canonicalRole, item.href);
    });
  }, [activeWorkspace, canonicalRole, roleResolved]);

  const activeLabel = useMemo(
    () => visibleItems.find((item) => item.href === pathname)?.label ?? title,
    [pathname, visibleItems, title]
  );

  return (
    <div className="anr" data-theme={theme}>
      <div className={`anr-shell ${isSidebarCollapsed ? "anr-shell--collapsed" : ""}`}>
        <AnimatePresence>
          {isMobileOpen ? (
            <motion.button
              type="button"
              className="anr-backdrop"
              onClick={() => setIsMobileOpen(false)}
              aria-label="Close navigation backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
          ) : null}
        </AnimatePresence>

        <aside
          className={`anr-sidebar ${isMobileOpen ? "anr-sidebar--mobile-open" : ""}`}
        >
          <div className="anr-sidebar__brand">
            <p className="anr-brand">Jandarpan</p>
            {!isSidebarCollapsed ? (
              <p className="anr-meta">Command Centre</p>
            ) : null}
          </div>

          {!isSidebarCollapsed && availableWorkspaces.length > 1 ? (
            <div className="anr-workspace-switcher">
              <button
                type="button"
                className="anr-workspace-switcher__trigger"
                onClick={() => setWorkspaceOpen((v) => !v)}
                aria-expanded={workspaceOpen}
                aria-haspopup="listbox"
              >
                <span>
                  <strong>{activeWorkspace?.label ?? "Workspace"}</strong>
                  <em>{activeWorkspace?.description ?? ""}</em>
                </span>
                <ChevronDown size={14} aria-hidden />
              </button>
              {workspaceOpen ? (
                <ul className="anr-workspace-switcher__menu" role="listbox">
                  {availableWorkspaces.map((ws) => (
                    <li key={ws.id}>
                      <Link
                        href={ws.homeHref}
                        className={
                          ws.id === activeWorkspace?.id
                            ? "anr-workspace-switcher__item anr-workspace-switcher__item--active"
                            : "anr-workspace-switcher__item"
                        }
                        onClick={() => {
                          setWorkspaceOpen(false);
                          setIsMobileOpen(false);
                        }}
                        role="option"
                        aria-selected={ws.id === activeWorkspace?.id}
                      >
                        <strong>{ws.label}</strong>
                        <em>{ws.description}</em>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <nav className="anr-nav" aria-busy={!roleResolved} aria-label="Workspace navigation">
            {!roleResolved ? (
              <div className="anr-nav-loading">
                <AdminAuthLoading label="Loading navigation…" />
              </div>
            ) : null}
            {visibleItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== activeWorkspace?.homeHref &&
                  pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`anr-nav-link ${active ? "anr-nav-link--active" : ""}`}
                >
                  {!isSidebarCollapsed ? <span>{item.label}</span> : <span aria-label={item.label}>·</span>}
                </Link>
              );
            })}
          </nav>

          <div className="anr-sidebar__footer">
            <button
              type="button"
              className="anr-btn anr-btn--ghost anr-sidebar__collapse"
              onClick={() => setIsSidebarCollapsed((v) => !v)}
              aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              {!isSidebarCollapsed ? <span>Collapse</span> : null}
            </button>
            <div className="anr-sidebar__user">
              <UserCircle2 size={18} />
              {!isSidebarCollapsed ? (
                <div>
                  <p>{email || "Newsroom"}</p>
                  <span>
                    {roleResolved ? role : "…"} · {tenantName || "desk"}
                  </span>
                </div>
              ) : null}
            </div>
            {!isSidebarCollapsed ? (
              <button
                type="button"
                className="anr-btn anr-btn--ghost"
                style={{ marginTop: "0.5rem", width: "100%" }}
                onClick={signOut}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </aside>

        <main className="anr-main">
          <header className="anr-topbar">
            <div className="anr-topbar__left">
              <button
                type="button"
                className="anr-btn anr-btn--ghost anr-mobile-toggle"
                onClick={() => setIsMobileOpen((v) => !v)}
                aria-label="Toggle sidebar"
              >
                <Menu size={16} />
              </button>
              <div className="anr-search">
                <Search size={14} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    searchPlaceholder ?? `Search ${activeLabel.toLowerCase()}...`
                  }
                  aria-label="Quick search"
                />
              </div>
            </div>
            <div className="anr-topbar__right">
              <LiveIndicator label="Live" />
              <ClientTime preset="clock" className="anr-clock" />
              <button type="button" className="anr-btn anr-btn--ghost" aria-label="Notifications">
                <Bell size={16} />
              </button>
              <button
                type="button"
                className="anr-btn anr-btn--ghost"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </header>

          {!hidePageHeader ? (
            <motion.header
              className="anr-header"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div>
                <p className="anr-meta">
                  {activeWorkspace?.label ?? "Admin"} · Jandarpan.news
                </p>
                <h1>{title}</h1>
                {subtitle ? <p className="anr-meta">{subtitle}</p> : null}
              </div>
              <div>
                {data ? (
                  <p className="anr-meta">
                    Updated <ClientTime iso={data.fetchedAt} preset="time" />
                  </p>
                ) : null}
              </div>
            </motion.header>
          ) : null}

          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: 0.04 }}
          >
            {children}
          </motion.section>
        </main>
      </div>
      {toast ? <div className="anr-toast" role="status">{toast}</div> : null}
    </div>
  );
}
