"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { AdminPageErrorBoundary } from "@/components/admin-newsroom/AdminPageErrorBoundary";
import { CommandMenu } from "@/components/admin-v3/CommandMenu";
import { useCanonicalStatus } from "@/hooks/useCanonicalStatus";
import { useHydrationSafe } from "@/hooks/useHydrationSafe";
import { resetAdminQueryClient } from "@/lib/query/query-client";
import { JAN_DARPAN_BRAND_ASSETS } from "@/lib/brand/assets";
import {
  moreToolsLabel,
  primaryNavItems,
  primaryWorkspacesForRole,
  resolveWorkspaceFromPath,
  secondaryNavItems,
  secondaryWorkspacesForRole,
  type AdminWorkspaceId,
} from "@/lib/admin-platform/workspaces";
import { navIcon } from "@/lib/admin-platform/nav-icons";
import { canAccessAdminRoute, isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { hasResolvedRole } from "@/lib/auth/admin-permissions";
import { normalizeDashboardRole } from "@/lib/saas-auth/roles";

const COLLAPSE_KEY = "jd-admin-sidebar-collapsed";
const DESKTOP_MIN_PX = 1200;

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
  const pathname = usePathname() ?? "";
  const { email, role, tenantName, theme, setTheme, toast, roleResolved } =
    useAdminNewsroom();
  const { snapshot: health, loading: healthLoading, label: stateLabel, state } =
    useCanonicalStatus();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [headerAccountOpen, setHeaderAccountOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [showMoreRoutes, setShowMoreRoutes] = useState(false);
  const [desktopViewport, setDesktopViewport] = useState(true);
  const [localSearch] = useState("");
  const statusWrapRef = useRef<HTMLDivElement>(null);
  const headerAccountRef = useRef<HTMLDivElement>(null);
  const search = searchValue ?? localSearch;
  void onSearchChange;

  useHydrationSafe("admin_shell");

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (window.localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DESKTOP_MIN_PX}px)`);
    const apply = () => setDesktopViewport(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
      if (e.key === "Escape") {
        if (cmdOpen) setCmdOpen(false);
        else if (statusOpen) setStatusOpen(false);
        else if (mobileOpen) setMobileOpen(false);
        else if (accountOpen) setAccountOpen(false);
        else if (headerAccountOpen) setHeaderAccountOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cmdOpen, statusOpen, mobileOpen, accountOpen, headerAccountOpen]);

  useEffect(() => {
    if (!statusOpen) return;
    function onPointer(e: MouseEvent) {
      const target = e.target as Node | null;
      if (statusWrapRef.current && target && !statusWrapRef.current.contains(target)) {
        setStatusOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [statusOpen]);

  useEffect(() => {
    if (!headerAccountOpen) return;
    function onPointer(e: MouseEvent) {
      const target = e.target as Node | null;
      if (
        headerAccountRef.current &&
        target &&
        !headerAccountRef.current.contains(target)
      ) {
        setHeaderAccountOpen(false);
      }
    }
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [headerAccountOpen]);

  useEffect(() => {
    const locked =
      mobileOpen || cmdOpen || statusOpen || accountOpen || headerAccountOpen;
    document.body.classList.toggle("av3-body-lock", locked);
    return () => document.body.classList.remove("av3-body-lock");
  }, [mobileOpen, cmdOpen, statusOpen, accountOpen, headerAccountOpen]);

  useEffect(() => {
    const anyOverlay =
      mobileOpen || cmdOpen || statusOpen || headerAccountOpen || accountOpen;
    if (!anyOverlay) return;

    const alreadyMarked =
      typeof window.history.state === "object" &&
      window.history.state !== null &&
      (window.history.state as { av3Overlay?: boolean }).av3Overlay === true;
    if (!alreadyMarked) {
      window.history.pushState({ av3Overlay: true }, "");
    }

    function onPop() {
      setCmdOpen(false);
      setStatusOpen(false);
      setHeaderAccountOpen(false);
      setMobileOpen(false);
      setAccountOpen(false);
    }

    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [mobileOpen, cmdOpen, statusOpen, headerAccountOpen, accountOpen]);

  useEffect(() => {
    setShowMoreRoutes(false);
    setMobileOpen(false);
    setCmdOpen(false);
    setStatusOpen(false);
    setAccountOpen(false);
    setHeaderAccountOpen(false);
    setWorkspaceOpen(false);
  }, [pathname]);

  function openExclusive(
    kind: "drawer" | "cmd" | "status" | "account" | "headerAccount" | null
  ) {
    setMobileOpen(kind === "drawer");
    setCmdOpen(kind === "cmd");
    setStatusOpen(kind === "status");
    setAccountOpen(kind === "account");
    setHeaderAccountOpen(kind === "headerAccount");
    if (kind !== "drawer") setWorkspaceOpen(false);
  }

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

  const primaryRoutes = primaryNavItems(visibleItems);
  const extraRoutes = secondaryNavItems(visibleItems);
  const moreLabel = moreToolsLabel(activeWorkspaceId);
  const listedRoutes =
    showMoreRoutes || extraRoutes.length === 0
      ? [...primaryRoutes, ...extraRoutes]
      : primaryRoutes;

  const shellCollapsed = collapsed && desktopViewport && !mobileOpen;
  const navCompact = shellCollapsed;
  const displayLabel =
    healthLoading && !health ? "Checking…" : stateLabel;
  const statusIncidents =
    (health?.topIncidents?.length
      ? health.topIncidents
      : health?.reasons?.slice(0, 3)) ?? [];
  const criticalCount = health?.criticalCount ?? 0;
  const warningCount = health?.warningCount ?? 0;
  const shortRole = roleResolved && role ? String(role).replace(/_/g, " ") : "…";

  const accountMenuItems = (
    <>
      <div className="av3-account-menu__head">
        <div>
          <strong>{email || "Newsroom account"}</strong>
          <span>
            {shortRole} · {tenantName || "desk"}
          </span>
        </div>
        <button
          type="button"
          className="av3-btn av3-btn--ghost av3-only-mobile"
          aria-label="Close account menu"
          onClick={() => openExclusive(null)}
        >
          <X size={16} />
        </button>
      </div>
      {secondaryWorkspaces.map((ws) => (
        <Link
          key={ws.id}
          href={ws.homeHref}
          onClick={() => {
            setAccountOpen(false);
            setHeaderAccountOpen(false);
            setMobileOpen(false);
          }}
        >
          {ws.label}
        </Link>
      ))}
      <button
        type="button"
        className="av3-account-menu__theme av3-only-mobile"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      </button>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </>
  );

  const statusPanel = (
    <div className="av3-status-popover" role="dialog" aria-label="Production status">
      <header className="av3-status-popover__head">
        <p className="av3-status-popover__title">{displayLabel}</p>
        <button
          type="button"
          className="av3-btn av3-btn--ghost av3-only-mobile"
          aria-label="Close status"
          onClick={() => setStatusOpen(false)}
        >
          <X size={16} />
        </button>
      </header>
      <p className="av3-note">
        {criticalCount} critical · {warningCount} warning
      </p>
      {statusIncidents.length > 0 ? (
        <ul className="av3-attention-list">
          {statusIncidents.map((inc) => (
            <li
              key={inc.id}
              className={`av3-attention-row av3-attention-row--${
                inc.severity === "critical" ? "critical" : "warning"
              }`}
            >
              <span>
                <em>{inc.title}</em>
                <strong>{inc.detail ?? inc.severity}</strong>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="av3-note">No active incidents in this snapshot.</p>
      )}
      <Link
        href="/admin/health"
        className="av3-status-popover__link"
        onClick={() => setStatusOpen(false)}
      >
        Open health details
      </Link>
    </div>
  );

  function renderRouteLink(
    item: (typeof visibleItems)[number],
    opts?: { compact?: boolean }
  ) {
    const Icon = navIcon(item.iconKey);
    const active =
      pathname === item.href ||
      (item.href !== activeWorkspace?.homeHref &&
        pathname.startsWith(`${item.href}/`));
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`av3-nav-link ${active ? "av3-nav-link--active" : ""}`}
        title={opts?.compact ? item.label : undefined}
        aria-label={item.label}
        onClick={() => setMobileOpen(false)}
      >
        <Icon size={18} aria-hidden />
        {!opts?.compact ? <span>{item.label}</span> : null}
      </Link>
    );
  }

  return (
    <div className="anr av3" data-theme={theme}>
      <div
        className={`av3-shell ${shellCollapsed ? "av3-shell--collapsed" : ""} ${
          mobileOpen ? "av3-shell--drawer-open" : ""
        } ${hidePageHeader ? "av3-shell--dense" : ""}`}
      >
        {mobileOpen ? (
          <button
            type="button"
            className="av3-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <aside
          className={`av3-sidebar ${mobileOpen ? "av3-sidebar--mobile-open" : ""}`}
          aria-label="Admin navigation"
        >
          <div className="av3-sidebar__brand">
            <div className="av3-sidebar__brand-row">
              <Link
                href="/admin/overview"
                className="av3-brand-link"
                onClick={() => setMobileOpen(false)}
              >
                {navCompact ? (
                  <Image
                    src={JAN_DARPAN_BRAND_ASSETS.mark}
                    alt="Jan Darpan"
                    width={36}
                    height={36}
                    className="av3-brand-mark"
                    priority
                  />
                ) : (
                  <Image
                    src={JAN_DARPAN_BRAND_ASSETS.logo}
                    alt="Jan Darpan Chhattisgarh"
                    width={148}
                    height={30}
                    className="av3-brand-logo"
                    priority
                  />
                )}
              </Link>
              <button
                type="button"
                className="av3-btn av3-btn--ghost av3-drawer-close"
                aria-label="Close navigation"
                onClick={() => setMobileOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            {!navCompact ? <p className="av3-brand-tag">Command Centre</p> : null}
          </div>

          <nav className="av3-drawer-workspaces av3-only-mobile" aria-label="Workspaces">
            {primaryWorkspaces.map((ws) => {
              const Icon = navIcon(ws.items[0]?.iconKey ?? "layout");
              const active = ws.id === activeWorkspaceId;
              return (
                <Link
                  key={ws.id}
                  href={ws.homeHref}
                  className={`av3-drawer-ws ${active ? "av3-drawer-ws--active" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={18} aria-hidden />
                  <span>
                    <strong>{ws.label}</strong>
                    <em>{ws.description}</em>
                  </span>
                </Link>
              );
            })}
          </nav>

          {!navCompact && primaryWorkspaces.length > 1 ? (
            <div className="av3-workspace av3-only-desktop">
              <button
                type="button"
                className="av3-workspace__btn"
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
                <ul className="av3-workspace__menu">
                  {primaryWorkspaces.map((ws) => (
                    <li key={ws.id}>
                      <Link
                        href={ws.homeHref}
                        onClick={() => {
                          setWorkspaceOpen(false);
                          setMobileOpen(false);
                        }}
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

          <nav className="av3-nav" aria-label="Workspace navigation">
            {!roleResolved ? (
              <div className="av3-nav-loading">
                <AdminAuthLoading label="Loading navigation…" />
              </div>
            ) : null}

            <p className="av3-nav-section av3-only-mobile">
              {activeWorkspace?.label ?? "Routes"}
            </p>

            {listedRoutes.map((item) =>
              renderRouteLink(item, { compact: navCompact })
            )}

            {extraRoutes.length > 0 ? (
              <button
                type="button"
                className="av3-nav-more"
                data-testid="admin-nav-more-tools"
                onClick={() => setShowMoreRoutes((v) => !v)}
              >
                {showMoreRoutes
                  ? "Show fewer"
                  : `${moreLabel} (${extraRoutes.length})`}
              </button>
            ) : null}
          </nav>

          <div className="av3-sidebar__footer">
            {desktopViewport ? (
              <button
                type="button"
                className="av3-btn av3-btn--ghost av3-sidebar__collapse av3-only-desktop"
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                {!navCompact ? <span>Collapse</span> : null}
              </button>
            ) : null}

            <div className="av3-sidebar__user-wrap">
              <button
                type="button"
                className="av3-sidebar__user"
                onClick={() => openExclusive(accountOpen ? null : "account")}
                aria-expanded={accountOpen}
                title={email || "Account"}
              >
                <UserCircle2 size={20} aria-hidden />
                {!navCompact ? (
                  <>
                    <div className="av3-sidebar__user-copy">
                      <p>{email || "Newsroom"}</p>
                      <span>{shortRole}</span>
                    </div>
                    <ChevronDown
                      size={14}
                      aria-hidden
                      className="av3-sidebar__user-chevron"
                    />
                  </>
                ) : null}
              </button>
              {accountOpen ? (
                <div className="av3-account-menu" role="menu">
                  {accountMenuItems}
                </div>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="av3-main">
          <header className="av3-topbar">
            <div className="av3-topbar__left">
              <button
                type="button"
                className="av3-btn av3-btn--ghost av3-mobile-toggle"
                onClick={() => openExclusive(mobileOpen ? null : "drawer")}
                aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>

              <span className="av3-topbar__workspace av3-only-mobile">
                {activeWorkspace?.label ?? "Admin"}
              </span>

              <button
                type="button"
                className="av3-search av3-search--desktop"
                onClick={() => openExclusive("cmd")}
                aria-label="Open command search"
              >
                <Search size={14} aria-hidden />
                <span>{searchPlaceholder ?? "Search routes, stories…"}</span>
                <kbd>Ctrl K</kbd>
              </button>
            </div>

            <div className="av3-topbar__right">
              <button
                type="button"
                className="av3-btn av3-btn--ghost av3-search-icon av3-only-mobile"
                onClick={() => openExclusive("cmd")}
                aria-label="Search"
              >
                <Search size={18} />
              </button>

              <div className="av3-status-wrap" ref={statusWrapRef}>
                <button
                  type="button"
                  className={`av3-env-pill av3-env-pill--${state} av3-env-pill--desktop`}
                  aria-expanded={statusOpen}
                  onClick={() => openExclusive(statusOpen ? null : "status")}
                  title="Canonical production health"
                >
                  {displayLabel}
                </button>
                <button
                  type="button"
                  className={`av3-status-dot av3-status-dot--${state} av3-only-mobile`}
                  aria-label={`Production status: ${displayLabel}`}
                  aria-expanded={statusOpen}
                  onClick={() => openExclusive(statusOpen ? null : "status")}
                >
                  <span />
                </button>
                {statusOpen ? (
                  <>
                    <button
                      type="button"
                      className="av3-sheet-backdrop av3-only-mobile"
                      aria-label="Close status"
                      onClick={() => setStatusOpen(false)}
                    />
                    {statusPanel}
                  </>
                ) : null}
              </div>

              <NotificationCentre />

              <button
                type="button"
                className="av3-btn av3-btn--ghost av3-theme-desktop"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              <div className="av3-header-account av3-only-mobile" ref={headerAccountRef}>
                <button
                  type="button"
                  className="av3-btn av3-btn--ghost"
                  aria-label="Account menu"
                  aria-expanded={headerAccountOpen}
                  onClick={() =>
                    openExclusive(headerAccountOpen ? null : "headerAccount")
                  }
                >
                  <UserCircle2 size={20} />
                </button>
                {headerAccountOpen ? (
                  <div className="av3-account-menu av3-account-menu--header" role="menu">
                    {accountMenuItems}
                  </div>
                ) : null}
              </div>
            </div>
          </header>

          {!hidePageHeader ? (
            <header className="av3-page-header">
              <div>
                <p className="av3-meta">
                  {activeWorkspace?.label ?? "Admin"} · Jandarpan.news
                </p>
                <h1>{title}</h1>
                {subtitle ? <p className="av3-meta">{subtitle}</p> : null}
              </div>
            </header>
          ) : null}

          <section
            className={`av3-content av3-page-enter ${
              hidePageHeader ? "av3-content--dense" : ""
            }`}
          >
            <AdminPageErrorBoundary>{children}</AdminPageErrorBoundary>
          </section>
        </main>
      </div>

      <CommandMenu
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        initialQuery={search}
        role={canonicalRole}
      />
      {toast ? (
        <div className="av3-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
