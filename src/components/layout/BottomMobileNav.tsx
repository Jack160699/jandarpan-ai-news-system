"use client";

import Link from "next/link";
import { LayoutGrid } from "lucide-react";
import { BOTTOM_NAV_TABS } from "@/lib/navigation";
import {
  isBottomNavActive,
  isBottomNavPending,
  resolveNavHref,
} from "@/lib/navigation/active";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { IconHome, IconLive, IconVideo } from "@/components/navigation/NavIcons";

const ICONS = {
  home: IconHome,
  video: IconVideo,
  live: IconLive,
} as const;

const TAB_KEYS: Record<string, keyof ReturnType<typeof useLanguage>["t"]["nav"]> = {
  home: "home",
  videos: "video",
  live: "live",
  menu: "menu",
};

export function BottomMobileNav() {
  const { pathname, hash, pendingPath, startNavigation, menuOpen, openMenu } =
    useNavigation();
  const { t } = useLanguage();

  return (
    <nav className="bottom-mobile-nav" aria-label="Main">
      <div className="bottom-mobile-nav__inner">
        {BOTTOM_NAV_TABS.map((tab) => {
          const isMenu = tab.id === "menu";
          const Icon = isMenu ? null : ICONS[tab.icon as keyof typeof ICONS];
          const active = isMenu
            ? menuOpen
            : isBottomNavActive(tab, pathname, hash) ||
              isBottomNavPending(tab, pendingPath);
          const label = t.nav[TAB_KEYS[tab.id] ?? "home"];

          if (isMenu) {
            return (
              <button
                key={tab.id}
                type="button"
                className={`bottom-mobile-nav__item bottom-mobile-nav__item--menu tap-target${active ? " is-active" : ""}`}
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
                aria-label={label}
                onClick={() => {
                  triggerHaptic("selection");
                  openMenu();
                }}
              >
                <LayoutGrid className="bottom-mobile-nav__icon" strokeWidth={1.75} aria-hidden />
                <span>{label}</span>
              </button>
            );
          }

          const href = resolveNavHref(tab.href, pathname);

          return (
            <Link
              key={tab.id}
              href={href}
              prefetch={tab.id === "home"}
              className={`bottom-mobile-nav__item${tab.id === "live" ? " bottom-mobile-nav__item--live" : ""}${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                triggerHaptic(tab.id === "live" ? "medium" : "selection");
                startNavigation(href);
              }}
            >
              {Icon ? <Icon className="bottom-mobile-nav__icon" /> : null}
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
