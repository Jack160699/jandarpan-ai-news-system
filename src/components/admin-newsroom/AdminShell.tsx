"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  Moon,
  Search,
  Sun,
  UserCircle2,
  X,
} from "lucide-react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { AdminAuthLoading } from "@/components/admin-newsroom/AdminAuthLoading";
import { NotificationCentre } from "@/components/admin-newsroom/NotificationCentre";
import { useHydrationSafe } from "@/hooks/useHydrationSafe";
import { resetAdminQueryClient } from "@/lib/query/query-client";
import { JAN_DARPAN_BRAND_ASSETS } from "@/lib/brand/assets";
import {
  primaryWorkspacesForRole,
  resolveWorkspaceFromPath,
  secondaryWorkspacesForRole,
  type AdminWorkspaceId,
} from "@/lib/admin-platform/workspaces";
import { navIcon } from "@/lib/admin-platform/nav-icons";
import { canAccessAdminRoute, isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { hasResolvedRole } from "@/lib/auth/admin-permissions";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";

const COLLAPSE_KEY = "jd-admin-sidebar-collapsed";

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
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
  const { email, role, tenantName, theme, setTheme, toast, roleResolved } =
    useAdminNewsroom();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [systemState, setSystemState] = useState<"healthy" | "degraded" | "unknown">(
    "unknown"
  );
  const search = searchValue ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;

  useHydrationSafe("admin_shell");

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(COLLAPSE_KEY) === "1") {
          setCollapsed(true);
        }
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function probe() {
      try {
        const res = await fetch("/api/admin/ops/health", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        if (json.status === "healthy" || json.ok === true) setSystemState("healthy");
        else if (json.status === "degraded" || json.status === "unhealthy") {
          setSystemState("degraded");
        }
      } catch {
        /* optional for non-monitoring roles */
      }
    }
    void probe();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  async function signOut() {
    await fetch("/api/dashboard/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    resetAdminQueryClient();
    window.location.assign("/admin/login");
  }

  const canonicalRole = role ? normalizeDashboardRole(String(role)) : null;

  const primaryWorkspaces = useMemo(() => {
    if (!roleResolved || !canonicalRole) return [];
    return primaryWorkspacesForRole(canonicalRole).filter(
      (ws) =>
        canAccessAdminRoute(canonicalRole, ws.homeHref) ||
        ws.items.some((item) => canAccessAdminRoute(canonicalRole, item.href))
    );
  }, [canonicalRole, roleResolved]);

  const secondaryWorkspaces = useMemo(() => {
    if (!roleResolved || !canonicalRole) return [];
    return secondaryWorkspacesForRole(canonicalRole);
  }, [canonicalRole, roleResolved]);

  const activeWorkspaceId: AdminWorkspaceId = resolveWorkspaceFromPath(pathname);
  const activeWorkspace =
    [...primaryWorkspaces, ...secondaryWorkspaces].find(
      (w) => w.id === activeWorkspaceId
    ) ??
    primaryWorkspaces[0] ??
    null;

  const visibleItems = useMemo(() => {
    if (!activeWorkspace || !roleResolved || !canonicalRole) return [];
    return activeWorkspace.items.filter((item) => {
      if (item.href === "/admin/team" || item.href === "/admin/schema") {
        return (
          hasResolvedRole({ role: canonicalRole, authReady: roleResolved }) &&
          isSuperAdmin(canonicalRole)
        );
      }
      return canAccessAdminRoute(canonicalRole, item.href);
    });
  }, [activeWorkspace, canonicalRole, roleResolved]);

  const stateLabel =
    systemState === "healthy"
      ? "Production · Healthy"
      : systemState === "degraded"
        ? "Production · Degraded"
        : "Production";

  const navCompact = collapsed && !mobileOpen;

  const sidebarInner = (
    <>
      <div className="anr-sidebar__brand">
        <Link href="/admin/overview" className="anr-brand-link" onClick={() => setMobileOpen(false)}>
          {collapsed && !mobileOpen ? (
            <Image
              src={JAN_DARPAN_BRAND_ASSETS.mark}
              alt="Jan Darpan"
              width={40}
              height={40}
              className="anr-brand-mark"
              priority
            />
          ) : (
            <Image
              src={JAN_DARPAN_BRAND_ASSETS.logo}
              alt="Jan Darpan Chhattisgarh"
              width={196}
              height={40}
              className="anr-brand-logo"
              priority
            />
          )}
        </Link>
        {!collapsed || mobileOpen ? (
          <p className="anr-meta anr-brand-tag">Command Centre</p>
        ) : null}
      </div>

      {(!collapsed || mobileOpen) && primaryWorkspaces.length > 1 ? (
        <div className="anr-workspace-switcher">
          <button
            type="button"
            className="anr-workspace-switcher__trigger"
            onClick={() => setWorkspaceOpen((v) => !v)}
            aria-expanded={workspaceOpen}
          >
            <span>
              <strong>{activeWorkspace?.label ?? "Workspace"}</strong>
              <em>{activeWorkspace?.description ?? ""}</em>
            </span>
            <ChevronDown size={14} aria-hidden />
          </button>
          {workspaceOpen ? (
            <ul className="anr-workspace-switcher__menu" role="listbox">
              {primaryWorkspaces.map((ws) => (
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
                      setMobileOpen(false);
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

      <nav className="anr-nav" aria-label="Workspace navigation">
        {!roleResolved ? (
          <div className="anr-nav-loading">
            <AdminAuthLoading label="Loading navigation…" />
          </div>
        ) : null}
        {visibleItems.map((item) => {
          const Icon = navIcon(item.iconKey);
          const active =
            pathname === item.href ||
            (item.href !== activeWorkspace?.homeHref &&
              pathname.startsWith(`${item.href}/`));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`anr-nav-link ${active ? "anr-nav-link--active" : ""}`}
              title={navCompact ? item.label : undefined}
              aria-label={item.label}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} aria-hidden />
              {!navCompact ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="anr-sidebar__footer">
        <button
          type="button"
          className="anr-btn anr-btn--ghost anr-sidebar__collapse"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed || mobileOpen ? <span>Collapse</span> : null}
        </button>

        <div className="anr-sidebar__user-wrap">
          <button
            type="button"
            className="anr-sidebar__user"
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
            title={email || "Account"}
          >
            <UserCircle2 size={20} aria-hidden />
            {!collapsed || mobileOpen ? (
              <div>
                <p>{email || "Newsroom"}</p>
                <span>
                  {roleResolved ? role : "…"} · {tenantName || "desk"}
                </span>
              </div>
            ) : null}
          </button>
          {accountOpen ? (
            <div className="anr-account-menu">
              {secondaryWorkspaces.map((ws) => (
                <Link
                  key={ws.id}
                  href={ws.homeHref}
                  onClick={() => {
                    setAccountOpen(false);
                    setMobileOpen(false);
                  }}
                >
                  {ws.label}
                </Link>
              ))}
              <button type="button" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );

  return (
    <div className="anr" data-theme={theme}>
      <div className={`anr-shell ${collapsed ? "anr-shell--collapsed" : ""}`}>
        {mobileOpen ? (
          <button
            type="button"
            className="anr-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <aside
          className={`anr-sidebar ${mobileOpen ? "anr-sidebar--mobile-open" : ""}`}
          aria-label="Admin navigation"
        >
          {sidebarInner}
        </aside>

        <main className="anr-main">
          <header className="anr-topbar">
            <div className="anr-topbar__left">
              <button
                type="button"
                className="anr-btn anr-btn--ghost anr-mobile-toggle"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Open navigation"
              >
                {mobileOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
              <form
                className="anr-search"
                onSubmit={(e) => {
                  e.preventDefault();
                  const q = search.trim();
                  if (!q) return;
                  window.location.assign(
                    `/admin/stories?q=${encodeURIComponent(q)}`
                  );
                }}
              >
                <Search size={14} aria-hidden />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder ?? "Search stories, routes…"}
                  aria-label="Command search"
                />
              </form>
            </div>
            <div className="anr-topbar__right">
              <span
                className={`anr-env-pill anr-env-pill--${systemState}`}
                title="Based on latest health check"
              >
                {stateLabel}
              </span>
              <NotificationCentre />
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
            <header className="anr-header">
              <div>
                <p className="anr-meta">
                  {activeWorkspace?.label ?? "Admin"} · Jandarpan.news
                </p>
                <h1>{title}</h1>
                {subtitle ? <p className="anr-meta">{subtitle}</p> : null}
              </div>
            </header>
          ) : null}

          <section className="anr-content">{children}</section>
        </main>
      </div>
      {toast ? <div className="anr-toast" role="status">{toast}</div> : null}
    </div>
  );
}
