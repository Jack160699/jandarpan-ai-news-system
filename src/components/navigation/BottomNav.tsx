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
import { IconHome, IconLive, IconReels } from "./NavIcons";

const ICONS: Record<
  Exclude<import("@/lib/navigation").BottomNavIcon, "menu">,
  typeof IconHome
> = {
  home: IconHome,
  reels: IconReels,
  live: IconLive,
};

function BottomNavTabIcon({
  tab,
  className,
}: {
  tab: (typeof BOTTOM_NAV_TABS)[number];
  className: string;
}) {
  if (tab.icon === "menu") {
    return <LayoutGrid className={className} strokeWidth={1.75} aria-hidden />;
  }
  const Icon = ICONS[tab.icon];
  if (!Icon) return <span className={className} aria-hidden />;
  return <Icon className={className} />;
}

const TAB_KEYS: Record<string, keyof ReturnType<typeof useLanguage>["t"]["nav"]> = {
  home: "home",
  reels: "shorts",
  live: "live",
  menu: "menu",
};

export function BottomNav() {
  const { pathname, hash, pendingPath, startNavigation, menuOpen, openMenu } =
    useNavigation();
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav bottom-nav--premium md:hidden" aria-label="Main">
      <div className="bottom-nav__inner">
        {BOTTOM_NAV_TABS.map((tab) => {
          const isMenu = tab.id === "menu";
          const active = isMenu
            ? menuOpen
            : isBottomNavActive(tab, pathname, hash) ||
              isBottomNavPending(tab, pendingPath);
          const label = t.nav[TAB_KEYS[tab.id] ?? "home"];
          const isLive = tab.id === "live";

          if (isMenu) {
            return (
              <button
                key={tab.id}
                type="button"
                className={`bottom-nav__item tap-press motion-nav-tab bottom-nav__item--menu${active ? " is-active" : ""}`}
                aria-expanded={menuOpen}
                aria-haspopup="dialog"
                aria-label={label}
                onClick={() => {
                  triggerHaptic("selection");
                  openMenu();
                }}
              >
                <span className="bottom-nav__icon-wrap">
                  <BottomNavTabIcon tab={tab} className="bottom-nav__icon" />
                </span>
                <span className="bottom-nav__label">{label}</span>
              </button>
            );
          }

          const href = resolveNavHref(tab.href, pathname);

          return (
            <Link
              key={tab.id}
              href={href}
              prefetch={tab.id === "home"}
              className={`bottom-nav__item tap-press motion-nav-tab${active ? " is-active" : ""}${isLive ? " bottom-nav__item--live" : ""}${pendingPath === tab.href ? " is-pending" : ""}`}
              aria-current={active ? "page" : undefined}
              onClick={() => {
                triggerHaptic(isLive ? "medium" : "selection");
                startNavigation(href);
              }}
            >
              <span className="bottom-nav__icon-wrap">
                <BottomNavTabIcon tab={tab} className="bottom-nav__icon" />
              </span>
              <span className="bottom-nav__label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
