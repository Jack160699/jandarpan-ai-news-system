"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV_TABS } from "@/lib/navigation";
import { useLanguage } from "@/providers/LanguageProvider";
import {
  IconHome,
  IconLive,
  IconProfile,
  IconSaved,
  IconVideo,
} from "./NavIcons";

const ICONS = {
  home: IconHome,
  video: IconVideo,
  live: IconLive,
  saved: IconSaved,
  profile: IconProfile,
} as const;

const TAB_KEYS: Record<string, keyof ReturnType<typeof useLanguage>["t"]["nav"]> = {
  home: "home",
  video: "video",
  live: "live",
  saved: "saved",
  profile: "profile",
};

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const isActive = (tab: (typeof BOTTOM_NAV_TABS)[number]) => {
    if (tab.id === "home") return pathname === "/";
    if (tab.id === "saved") return pathname.startsWith("/archive");
    if (tab.id === "video") return pathname.startsWith("/shorts");
    if (tab.id === "profile") return pathname.startsWith("/search");
    return false;
  };

  return (
    <nav className="bottom-nav md:hidden" aria-label="Main navigation">
      {BOTTOM_NAV_TABS.map((tab) => {
        const Icon = ICONS[tab.icon];
        const active = isActive(tab);
        const label = t.nav[TAB_KEYS[tab.id] ?? "home"];
        const isHome = tab.id === "home";
        const isArchive = tab.id === "saved";

        if (isHome || isArchive) {
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={`bottom-nav__item tap-target ${active ? "is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="bottom-nav__icon" />
              <span className="bottom-nav__label">{label}</span>
            </Link>
          );
        }

        const href =
          tab.href.startsWith("/#") && pathname !== "/"
            ? `/${tab.href}`
            : tab.href;

        return (
          <Link
            key={tab.id}
            href={href}
            className={`bottom-nav__item tap-target ${active ? "is-active" : ""}`}
          >
            <Icon className="bottom-nav__icon" />
            <span className="bottom-nav__label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
