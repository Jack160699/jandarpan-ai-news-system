"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  HeartPulse,
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  PenLine,
  ChevronLeft,
  ChevronRight,
  Compass,
  Settings,
  Database,
  FileText,
  Image as ImageIcon,
  Images,
  LayoutDashboard,
  Menu,
  Moon,
  Radio,
  Search,
  Sparkles,
  Sun,
  UserCircle2,
  Brain,
  Users,
  GitBranch,
  MessagesSquare,
  ServerCog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { ClientTime } from "@/components/admin-newsroom/ui/ClientTime";
import { useAdminSessionOptional } from "@/providers/AdminSessionProvider";
import { useHydrationSafe } from "@/hooks/useHydrationSafe";
import { resetAdminQueryClient } from "@/lib/query/query-client";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";
import { isSuperAdmin } from "@/lib/newsroom-auth/rbac";
import { roleHasPermission } from "@/lib/saas-auth/rbac";

const NAV = [
  { href: "/admin/editorial", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/intelligence", label: "Intelligence", icon: Brain },
  { href: "/admin/editor", label: "Editor", icon: PenLine },
  { href: "/admin/workflow", label: "Workflow", icon: GitBranch },
  { href: "/admin/collaboration", label: "Collaboration", icon: MessagesSquare },
  { href: "/admin/stories", label: "Stories", icon: BookOpen },
  { href: "/admin/articles", label: "Articles", icon: FileText },
  { href: "/admin/districts", label: "Districts", icon: Compass },
  { href: "/admin/topics", label: "Topics", icon: Sparkles },
  { href: "/admin/sources", label: "Sources", icon: Radio },
  { href: "/admin/live-wire", label: "Live wire", icon: Activity },
  { href: "/admin/health", label: "Health", icon: HeartPulse },
  { href: "/admin/ingestion", label: "Ingestion", icon: Database },
  { href: "/admin/images", label: "Images", icon: ImageIcon },
  { href: "/admin/media", label: "Media", icon: Images },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/team", label: "Team", icon: Users },
  { href: "/admin/schema", label: "Schema", icon: ServerCog },
] as const;

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const pathname = usePathname();
  const { email, role, tenantName, data, theme, setTheme, toast } =
    useAdminNewsroom();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  useHydrationSafe("admin_shell");

  const adminSession = useAdminSessionOptional();

  async function signOut() {
    await fetch("/api/dashboard/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    adminSession?.invalidateSession();
    adminSession?.clearStaleCookies();
    resetAdminQueryClient();
    window.location.assign("/admin/login");
  }
  const visibleNav = useMemo(
    () =>
      NAV.filter((item) => {
        if (item.href === "/admin/team" || item.href === "/admin/schema") {
          return isSuperAdmin(role);
        }
        if (item.href === "/admin/billing") {
          return roleHasPermission(role, "billing:read");
        }
        return true;
      }),
    [role]
  );

  const activeLabel = useMemo(
    () => visibleNav.find((item) => item.href === pathname)?.label ?? "Admin",
    [pathname, visibleNav]
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
            <p className="anr-brand">Jan Darpan OS</p>
            {!isSidebarCollapsed ? (
              <p className="anr-meta">Premium AI Newsroom Console</p>
            ) : null}
          </div>
          <nav className="anr-nav">
            {visibleNav.map((item) => {
              const href = item.href;
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`anr-nav-link ${active ? "anr-nav-link--active" : ""}`}
                >
                  <Icon size={16} aria-hidden />
                  {!isSidebarCollapsed ? <span>{item.label}</span> : null}
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
                    {role || "member"} · {tenantName || "desk"}
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
                  placeholder={`Search ${activeLabel.toLowerCase()}...`}
                  aria-label="Quick search"
                />
              </div>
            </div>
            <div className="anr-topbar__right">
              <LiveIndicator label="Ingestion live" />
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
              <span className="anr-avatar" aria-hidden>
                JD
              </span>
            </div>
          </header>

          <motion.header
            className="anr-header"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div>
              <p className="anr-meta">AI Newsroom Operating System</p>
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
