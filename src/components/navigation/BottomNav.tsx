"use client";

import Link from "next/link";
import { BOTTOM_NAV_TABS } from "@/lib/navigation";
import {
  isBottomNavActive,
  isBottomNavPending,
  resolveNavHref,
} from "@/lib/navigation/active";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { IconHome, IconLive, IconProfile, IconVideo } from "./NavIcons";

const ICONS = {
  home: IconHome,
  video: IconVideo,
  live: IconLive,
  profile: IconProfile,
} as const;

const TAB_KEYS: Record<string, keyof ReturnType<typeof useLanguage>["t"]["nav"]> = {
  home: "home",
  videos: "video",
  live: "live",
  profile: "profile",
};

export function BottomNav() {
  const { pathname, hash, pendingPath, startNavigation } = useNavigation();
  const { t } = useLanguage();

  return (
    <nav className="bottom-nav bottom-nav--premium md:hidden" aria-label="Main">
      <div className="bottom-nav__inner">
        {BOTTOM_NAV_TABS.map((tab) => {
          const Icon = ICONS[tab.icon];
          const active =
            isBottomNavActive(tab, pathname, hash) ||
            isBottomNavPending(tab, pendingPath);
          const label = t.nav[TAB_KEYS[tab.id] ?? "home"];
          const isLive = tab.id === "live";
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
                <Icon className="bottom-nav__icon" />
              </span>
              <span className="bottom-nav__label">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
