"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Home, Radio } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { NAV_CATEGORIES } from "@/lib/navigation";
import { isCategoryActive } from "@/lib/navigation/active";
import { useShell } from "../AppShell/ShellProvider";

/**
 * Collapsible, resizable desktop sidebar with localStorage persistence.
 */
export function DesktopSidebar() {
  const pathname = usePathname();
  const { hash } = useNavigation();
  const { t } = useLanguage();
  const { sidebar, toggleSidebar, setSidebarWidth } = useShell();
  const [resizing, setResizing] = useState(false);

  const width = sidebar.collapsed ? 72 : sidebar.width;

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const startX = e.clientX;
    const startW = sidebar.width;

    const onMove = (ev: MouseEvent) => {
      setSidebarWidth(startW + (ev.clientX - startX));
    };
    const onUp = () => {
      setResizing(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <aside
      className={cn("jdp-sidebar", sidebar.collapsed && "jdp-sidebar--collapsed")}
      style={{ width }}
      aria-label="Sidebar navigation"
    >
      <div className="jdp-sidebar__header">
        {!sidebar.collapsed && (
          <span className="jdp-sidebar__label font-medium text-sm">
            {t.nav.menu}
          </span>
        )}
        <button
          type="button"
          className="jdp-sidebar__toggle"
          onClick={toggleSidebar}
          aria-label={sidebar.collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebar.collapsed}
        >
          {sidebar.collapsed ? (
            <ChevronRight size={18} aria-hidden />
          ) : (
            <ChevronLeft size={18} aria-hidden />
          )}
        </button>
      </div>
      <nav className="jdp-sidebar__nav">
        <Link
          href="/"
          className={cn(
            "jdp-sidebar__link",
            pathname === "/" && "jdp-sidebar__link--active"
          )}
        >
          <Home size={18} aria-hidden />
          <span className="jdp-sidebar__label">{t.nav.home}</span>
        </Link>
        <Link
          href="/live"
          className={cn(
            "jdp-sidebar__link",
            pathname.startsWith("/live") && "jdp-sidebar__link--active"
          )}
        >
          <Radio size={18} aria-hidden />
          <span className="jdp-sidebar__label">{t.nav.live}</span>
        </Link>
        {NAV_CATEGORIES.slice(0, 8).map((cat) => (
          <Link
            key={cat.id}
            href={cat.href}
            className={cn(
              "jdp-sidebar__link",
              isCategoryActive(cat, pathname, hash) &&
                "jdp-sidebar__link--active"
            )}
          >
            <span className="jdp-sidebar__label">{cat.label}</span>
          </Link>
        ))}
      </nav>
      {!sidebar.collapsed && (
        <div
          className={cn(
            "jdp-sidebar__resize",
            resizing && "jdp-sidebar__resize--active"
          )}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize sidebar"
          onMouseDown={onResizeStart}
        />
      )}
    </aside>
  );
}
