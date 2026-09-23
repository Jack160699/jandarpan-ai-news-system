"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Radio,
  MapPin,
  Compass,
  Landmark,
  Building2,
  ShieldAlert,
  Trophy,
  Briefcase,
  GraduationCap,
  Sparkles,
  Layers,
} from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { NAV_CATEGORIES } from "@/lib/navigation";
import { isCategoryActive } from "@/lib/navigation/active";
import { useShell } from "../AppShell/ShellProvider";

const DISTRICT_ITEMS = [
  { id: "raipur", label: "Raipur", labelHi: "रायपुर", href: "/district/raipur" },
  { id: "bilaspur", label: "Bilaspur", labelHi: "बिलासपुर", href: "/district/bilaspur" },
  { id: "bastar", label: "Bastar", labelHi: "बस्तर", href: "/district/bastar" },
  { id: "durg", label: "Durg", labelHi: "दुर्ग", href: "/district/durg" },
];

function getCategoryIcon(id: string) {
  switch (id) {
    case "top-news":
      return Sparkles;
    case "chhattisgarh":
      return MapPin;
    case "india":
      return Compass;
    case "raipur":
    case "bilaspur":
      return Landmark;
    case "politics":
      return Building2;
    case "crime":
      return ShieldAlert;
    case "sports":
      return Trophy;
    case "business":
      return Briefcase;
    case "education":
      return GraduationCap;
    default:
      return Layers;
  }
}

/**
 * Collapsible, resizable desktop sidebar with strict minimum width and bilingual typography.
 */
export function DesktopSidebar() {
  const pathname = usePathname();
  const { hash } = useNavigation();
  const { language, t } = useLanguage();
  const { sidebar, toggleSidebar, setSidebarWidth } = useShell();
  const [resizing, setResizing] = useState(false);

  const isHindi = language === "hi" || language === "cg";
  const width = sidebar.collapsed ? 72 : Math.max(240, sidebar.width || 260);

  const onResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const startX = e.clientX;
    const startW = width;

    const onMove = (ev: MouseEvent) => {
      setSidebarWidth(Math.max(240, startW + (ev.clientX - startX)));
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
          <span className="jdp-sidebar__label font-bold text-sm tracking-wide text-[var(--jds-color-text-primary)]">
            {t.nav.menu}
          </span>
        )}
        <button
          type="button"
          className="jdp-sidebar__toggle"
          onClick={toggleSidebar}
          aria-label={sidebar.collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!sidebar.collapsed}
          title={sidebar.collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebar.collapsed ? (
            <ChevronRight size={18} aria-hidden />
          ) : (
            <ChevronLeft size={18} aria-hidden />
          )}
        </button>
      </div>

      <nav className="jdp-sidebar__nav" role="navigation">
        <Link
          href="/"
          title={t.nav.home}
          className={cn(
            "jdp-sidebar__link",
            pathname === "/" && "jdp-sidebar__link--active"
          )}
        >
          <Home size={18} aria-hidden className="shrink-0" />
          <span className="jdp-sidebar__label">{t.nav.home}</span>
        </Link>

        <Link
          href="/live"
          title={t.nav.live}
          className={cn(
            "jdp-sidebar__link",
            pathname.startsWith("/live") && "jdp-sidebar__link--active"
          )}
        >
          <Radio size={18} aria-hidden className="shrink-0 text-red-500" />
          <span className="jdp-sidebar__label">{t.nav.live}</span>
        </Link>

        {/* Categories Section */}
        <div className="jdp-sidebar__section-title">
          {isHindi ? "श्रेणियां" : "Categories"}
        </div>

        {NAV_CATEGORIES.slice(0, 8).map((cat) => {
          const Icon = getCategoryIcon(cat.id);
          const label = isHindi ? (cat.labelHi || cat.label) : cat.label;
          const active = isCategoryActive(cat, pathname, hash);
          return (
            <Link
              key={cat.id}
              href={cat.href}
              title={label}
              className={cn(
                "jdp-sidebar__link",
                active && "jdp-sidebar__link--active"
              )}
            >
              <Icon size={18} aria-hidden className="shrink-0" />
              <span className="jdp-sidebar__label">{label}</span>
            </Link>
          );
        })}

        {/* Districts Section */}
        <div className="jdp-sidebar__section-title">
          {isHindi ? "जिला ब्यूरो" : "Districts"}
        </div>

        {DISTRICT_ITEMS.map((d) => {
          const label = isHindi ? d.labelHi : d.label;
          const active = pathname.startsWith(d.href);
          return (
            <Link
              key={d.id}
              href={d.href}
              title={label}
              className={cn(
                "jdp-sidebar__link",
                active && "jdp-sidebar__link--active"
              )}
            >
              <MapPin size={18} aria-hidden className="shrink-0 text-[var(--jds-color-brand-primary)]" />
              <span className="jdp-sidebar__label">{label}</span>
            </Link>
          );
        })}
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
