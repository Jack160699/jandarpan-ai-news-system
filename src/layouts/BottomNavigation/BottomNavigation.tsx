"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Home,
  MapPin,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useShell } from "../AppShell/ShellProvider";
import { useShellScrollHide } from "../hooks/useShellScrollHide";
import { SHELL_BOTTOM_NAV } from "../constants";

const ICONS = {
  home: Home,
  district: MapPin,
  ai: Sparkles,
  alerts: Bell,
  you: User,
} as const;

const LABELS: Record<string, keyof ReturnType<typeof useLanguage>["t"]["nav"] | string> = {
  home: "home",
  district: "chhattisgarh",
  ai: "search",
  alerts: "live",
  you: "menu",
};

/**
 * Mobile bottom navigation — five items with animated active indicator.
 * Hides on scroll down, reveals on scroll up. Safe-area aware.
 */
export function BottomNavigation({ hidden }: { hidden?: boolean }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { prefs } = useReaderPreferences();
  const { startNavigation, toggleMenu, menuOpen } = useNavigation();
  const { openCommandPalette } = useShell();
  const scrollHidden = useShellScrollHide(!hidden);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLElement>(null);

  const district = prefs.homeDistrict ?? "raipur";
  const isHidden = hidden || scrollHidden;

  const activeId = (() => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/district")) return "district";
    if (pathname.startsWith("/live")) return "alerts";
    if (menuOpen) return "you";
    return null;
  })();

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || !activeId) return;
    const el = nav.querySelector<HTMLElement>(`[data-nav-id="${activeId}"]`);
    if (!el) return;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicator({
      left: elRect.left - navRect.left + elRect.width / 2 - 10,
      width: 20,
    });
  }, [activeId, pathname, menuOpen]);

  if (hidden) return null;

  return (
    <nav
      ref={navRef}
      className={cn("jdp-bottomnav", isHidden && "jdp-bottomnav--hidden")}
      aria-label="Main navigation"
    >
      <div className="jdp-bottomnav__inner">
        {activeId && (
          <span
            className="jdp-bottomnav__indicator"
            style={{ left: indicator.left }}
            aria-hidden
          />
        )}
        {SHELL_BOTTOM_NAV.map((tab) => {
          const Icon = ICONS[tab.icon];
          const labelKey = LABELS[tab.id];
          const label =
            typeof labelKey === "string" && labelKey in t.nav
              ? t.nav[labelKey as keyof typeof t.nav]
              : tab.id;
          const isActive = activeId === tab.id;

          if ("action" in tab && tab.action === "menu") {
            return (
              <button
                key={tab.id}
                type="button"
                data-nav-id={tab.id}
                className={cn(
                  "jdp-bottomnav__item",
                  isActive && "jdp-bottomnav__item--active"
                )}
                aria-label={label}
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
                onClick={() => {
                  triggerHaptic("selection");
                  toggleMenu();
                }}
              >
                <Icon className="jdp-bottomnav__icon" aria-hidden />
                <span>{label}</span>
              </button>
            );
          }

          if ("action" in tab && tab.action === "command-palette") {
            return (
              <button
                key={tab.id}
                type="button"
                data-nav-id={tab.id}
                className="jdp-bottomnav__item"
                aria-label="AI Search"
                onClick={() => {
                  triggerHaptic("selection");
                  openCommandPalette();
                }}
              >
                <Icon className="jdp-bottomnav__icon" aria-hidden />
                <span>AI</span>
              </button>
            );
          }

          const href =
            tab.id === "district" ? `/district/${district}` : tab.href;

          return (
            <Link
              key={tab.id}
              href={href}
              data-nav-id={tab.id}
              className={cn(
                "jdp-bottomnav__item",
                isActive && "jdp-bottomnav__item--active"
              )}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                triggerHaptic("selection");
                startNavigation(href);
              }}
            >
              <Icon className="jdp-bottomnav__icon" aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
