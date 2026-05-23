"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminNewsroom } from "@/components/admin-newsroom/AdminProvider";

const NAV = [
  { href: "/admin/editorial", label: "Overview" },
  { href: "/admin/stories", label: "Stories" },
  { href: "/admin/live-wire", label: "Live wire" },
  { href: "/admin/images", label: "Images" },
  { href: "/admin/analytics", label: "Analytics" },
] as const;

type AdminShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const pathname = usePathname();
  const { adminKey, data, theme, setTheme, toast } = useAdminNewsroom();

  const qs = `?key=${encodeURIComponent(adminKey)}`;

  return (
    <div className="anr" data-theme={theme}>
      <div className="anr-shell">
        <aside className="anr-sidebar">
          <p className="anr-brand">हमार छत्तीसगढ़ · संपादकीय</p>
          {NAV.map((item) => {
            const href = `${item.href}${qs}`;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={href}
                className={`anr-nav-link ${active ? "anr-nav-link--active" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="anr-theme-toggle">
            <button
              type="button"
              className="anr-btn anr-btn--ghost"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? "Light" : "Dark"}
            </button>
          </div>
        </aside>

        <main className="anr-main">
          <header className="anr-header">
            <div>
              <p className="anr-meta">AI Newsroom · Editorial supervision</p>
              <h1>{title}</h1>
              {subtitle ? <p className="anr-meta">{subtitle}</p> : null}
            </div>
            <div>
              <span className="anr-live">
                <span className="anr-live-dot" aria-hidden />
                Live · 12s
              </span>
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
          </header>
          {children}
        </main>
      </div>
      {toast ? <div className="anr-toast" role="status">{toast}</div> : null}
    </div>
  );
}
