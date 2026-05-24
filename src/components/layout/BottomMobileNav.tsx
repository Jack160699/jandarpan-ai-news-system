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
import { IconHome, IconLive, IconProfile, IconVideo } from "@/components/navigation/NavIcons";

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

export function BottomMobileNav() {
  const { pathname, hash, pendingPath, startNavigation } = useNavigation();
  const { t } = useLanguage();

  return (
    <nav className="bottom-mobile-nav" aria-label="Main">
      <div className="bottom-mobile-nav__inner">
        {BOTTOM_NAV_TABS.map((tab) => {
          const Icon = ICONS[tab.icon];
          const active =
            isBottomNavActive(tab, pathname, hash) ||
            isBottomNavPending(tab, pendingPath);
          const label = t.nav[TAB_KEYS[tab.id] ?? "home"];
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
              <Icon className="bottom-mobile-nav__icon" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
