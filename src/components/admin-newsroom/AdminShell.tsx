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
import { CommandMenu } from "@/components/admin-v3/CommandMenu";
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
import type { CanonicalHealthSnapshot } from "@/lib/admin-v3/canonical-health";

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
  const [statusOpen, setStatusOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [health, setHealth] = useState<CanonicalHealthSnapshot | null>(null);
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
    let cancelled = false;
    async function probe() {
      try {
        const res = await fetch("/api/admin/system-status", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && json.snapshot) setHealth(json.snapshot);
      } catch {
        /* optional */
      }
    }
    void probe();
    const id = window.setInterval(() => void probe(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("av3-body-lock", mobileOpen);
    return () => document.body.classList.remove("av3-body-lock");
  }, [mobileOpen]);

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

  const navCompact = collapsed && !mobileOpen;
  const state = health?.state ?? "unknown";
  const stateLabel = health?.label ?? "Production · Unknown";

  const sidebarInner = (
    <>
      <div className="av3-sidebar__brand">
        <Link
          href="/admin/overview"
          className="av3-brand-link"
          onClick={() => setMobileOpen(false)}
        >
          {navCompact ? (
            <Image
              src={JAN_DARPAN_BRAND_ASSETS.mark}
              alt="Jan Darpan"
              width={40}
              height={40}
              className="av3-brand-mark"
              priority
            />
          ) : (
            <Image
              src={JAN_DARPAN_BRAND_ASSETS.logo}
              alt="Jan Darpan Chhattisgarh"
              width={168}
              height={34}
              className="av3-brand-logo"
              priority
            />
          )}
        </Link>
        {!navCompact ? <p className="av3-brand-tag">Command Centre</p> : null}
      </div>

      {!navCompact && primaryWorkspaces.length > 1 ? (
        <div className="av3-workspace">
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
              className={`av3-nav-link ${active ? "av3-nav-link--active" : ""}`}
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

      <div className="av3-sidebar__footer">
        <button
          type="button"
          className="av3-btn av3-btn--ghost av3-sidebar__collapse"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!navCompact ? <span>Collapse</span> : null}
        </button>

        <div className="av3-sidebar__user-wrap">
          <button
            type="button"
            className="av3-sidebar__user"
            onClick={() => setAccountOpen((v) => !v)}
            aria-expanded={accountOpen}
            title={email || "Account"}
          >
            <UserCircle2 size={20} aria-hidden />
            {!navCompact ? (
              <div>
                <p>{email || "Newsroom"}</p>
                <span>
                  {roleResolved ? role : "…"} · {tenantName || "desk"}
                </span>
              </div>
            ) : null}
          </button>
          {accountOpen ? (
            <div className="av3-account-menu">
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
    <div className="anr av3" data-theme={theme}>
      <div className={`av3-shell ${collapsed ? "av3-shell--collapsed" : ""}`}>
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
          {sidebarInner}
        </aside>

        <main className="av3-main">
          <header className="av3-topbar">
            <div className="av3-topbar__left">
              <button
                type="button"
                className="av3-btn av3-btn--ghost av3-mobile-toggle"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Open navigation"
              >
                {mobileOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
              <button
                type="button"
                className="av3-search"
                onClick={() => setCmdOpen(true)}
                aria-label="Open command search"
              >
                <Search size={14} aria-hidden />
                <span>{searchPlaceholder ?? "Search routes, stories…"}</span>
                <kbd>Ctrl K</kbd>
              </button>
            </div>
            <div className="av3-topbar__right">
              <div className="av3-status-wrap">
                <button
                  type="button"
                  className={`av3-env-pill av3-env-pill--${state}`}
                  aria-expanded={statusOpen}
                  onClick={() => setStatusOpen((v) => !v)}
                  title="Canonical production health"
                >
                  {stateLabel}
                </button>
                {statusOpen ? (
                  <div className="av3-status-popover" role="dialog">
                    <p className="av3-status-popover__title">{stateLabel}</p>
                    {(health?.reasons?.length ?? 0) > 0 ? (
                      <ul>
                        {health!.reasons.slice(0, 6).map((r) => (
                          <li key={r.id}>
                            <strong>{r.title}</strong>
                            <span>{r.detail}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="av3-meta">No open health reasons.</p>
                    )}
                    <Link href="/admin/health" onClick={() => setStatusOpen(false)}>
                      Open Platform health
                    </Link>
                  </div>
                ) : null}
              </div>
              <NotificationCentre />
              <button
                type="button"
                className="av3-btn av3-btn--ghost"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
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

          <section className="av3-content av3-page-enter">{children}</section>
        </main>
      </div>
      <CommandMenu
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        initialQuery={search}
      />
      {toast ? (
        <div className="av3-toast" role="status">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
