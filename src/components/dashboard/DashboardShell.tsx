"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEditorialDesk } from "@/providers/EditorialDeskContext";
import { canAccessDashboardRoute } from "@/lib/saas-auth/rbac";
import type { DashboardRole } from "@/lib/saas-auth/types";

const NAV = [
  { href: "/dashboard", label: "Overview", minRole: "viewer" as const },
  { href: "/dashboard/content", label: "Content", minRole: "viewer" as const },
  { href: "/dashboard/publish", label: "Publish", minRole: "editor" as const },
  { href: "/dashboard/editorial", label: "Editorial", minRole: "editor" as const },
  { href: "/dashboard/providers", label: "Providers", minRole: "editor" as const },
  { href: "/dashboard/analytics", label: "Intelligence", minRole: "viewer" as const },
  { href: "/dashboard/monitoring", label: "API Monitor", minRole: "viewer" as const },
  { href: "/dashboard/team", label: "Team", minRole: "admin" as const },
  { href: "/dashboard/billing", label: "Billing", minRole: "billing" as const },
] as const;

type DashboardShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function DashboardShell({ title, subtitle, children }: DashboardShellProps) {
  const pathname = usePathname();
  const { data, theme, setTheme, toast, logout, membership, role } =
    useEditorialDesk();

  const userRole = (role ?? "viewer") as DashboardRole;

  return (
    <div className="anr saas-dash" data-theme={theme}>
      <div className="anr-shell">
        <aside className="anr-sidebar">
          <span className="saas-dash-tenant-badge">
            {membership?.name ?? "Newsroom"}
          </span>
          <p className="anr-brand">AI Newsroom · Client Console</p>
          {NAV.map((item) => {
            if (!canAccessDashboardRoute(userRole, item.href)) {
              return null;
            }

            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`anr-nav-link ${active ? "anr-nav-link--active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="anr-theme-toggle" style={{ marginTop: "auto" }}>
            <button
              type="button"
              className="anr-btn anr-btn--ghost"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
            <button
              type="button"
              className="anr-btn anr-btn--ghost"
              onClick={() => logout()}
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="anr-main">
          <header className="anr-header">
            <div>
              <p className="anr-meta">{membership?.slug ?? "tenant"} · SaaS</p>
              <h1>{title}</h1>
              {subtitle ? <p className="anr-meta">{subtitle}</p> : null}
            </div>
            <div>
              <span className="anr-live">
                <span className="anr-live-dot" aria-hidden />
                Live · 15s
              </span>
              {data ? (
                <p className="anr-meta">
                  Updated{" "}
                  {new Date(data.fetchedAt).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              ) : null}
            </div>
          </header>
          {toast ? <p className="anr-toast">{toast}</p> : null}
          {children}
        </main>
      </div>
    </div>
  );
}
