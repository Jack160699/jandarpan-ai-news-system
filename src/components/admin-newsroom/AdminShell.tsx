"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  Moon,
  Radio,
  Search,
  Sparkles,
  Sun,
  UserCircle2,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";
import { LiveIndicator } from "@/components/admin-newsroom/ui/LiveIndicator";

const NAV = [
  { href: "/admin/editorial", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/intelligence", label: "Intelligence", icon: Brain },
  { href: "/admin/stories", label: "Stories", icon: BookOpen },
  { href: "/admin/articles", label: "Articles", icon: FileText },
  { href: "/admin/districts", label: "Districts", icon: Compass },
  { href: "/admin/topics", label: "Topics", icon: Sparkles },
  { href: "/admin/sources", label: "Sources", icon: Radio },
  { href: "/admin/live-wire", label: "Live wire", icon: Activity },
  { href: "/admin/images", label: "Images", icon: ImageIcon },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
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
  const [now, setNow] = useState(() => new Date());
  const [search, setSearch] = useState("");

  async function signOut() {
    await fetch("/api/dashboard/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    window.location.assign("/admin/login");
  }
  const activeLabel = useMemo(
    () => NAV.find((item) => item.href === pathname)?.label ?? "Admin",
    [pathname]
  );

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

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
            {NAV.map((item) => {
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
              <span className="anr-clock">
                {now.toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
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
                  Updated{" "}
                  {new Date(data.fetchedAt).toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
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
