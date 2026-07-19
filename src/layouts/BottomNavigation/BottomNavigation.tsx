"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Home, MapPin, Newspaper, User } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useShellScrollHide } from "../hooks/useShellScrollHide";
import { SHELL_BOTTOM_NAV } from "../constants";

const ICONS = {
  home: Home,
  district: MapPin,
  reels: Clapperboard,
  topnews: Newspaper,
  you: User,
} as const;

/**
 * Mobile bottom navigation — होम · जिला · रील्स · टॉप न्यूज़ · आप
 * Hides on scroll down, reveals on scroll up. Safe-area aware.
 */
export function BottomNavigation({ hidden }: { hidden?: boolean }) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { prefs } = useReaderPreferences();
  const { startNavigation } = useNavigation();
  const scrollHidden = useShellScrollHide(!hidden);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLElement>(null);

  const district = prefs.homeDistrict ?? "raipur";
  const isHidden = hidden || scrollHidden;

  const labels: Record<string, string> = {
    home: t.nav.home,
    district: t.nav.districts,
    reels: t.nav.reels,
    topnews: t.nav.topNews,
    you: language === "en" ? "You" : "आप",
  };

  const activeId = (() => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/district")) return "district";
    if (pathname.startsWith("/shorts")) return "reels";
    if (pathname.startsWith("/live")) return "topnews";
    if (pathname.startsWith("/archive") || pathname.startsWith("/profile"))
      return "you";
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
  }, [activeId, pathname]);

  if (hidden) return null;

  return (
    <nav
      ref={navRef}
      className={cn("jdp-bottomnav", isHidden && "jdp-bottomnav--hidden")}
      aria-label={language === "en" ? "Main navigation" : "मुख्य नेविगेशन"}
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
          const label = labels[tab.id] ?? tab.id;
          const isActive = activeId === tab.id;
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
