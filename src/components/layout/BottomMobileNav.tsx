"use client";

import Link from "next/link";
import { BOTTOM_NAV_TABS } from "@/lib/navigation";
import {
  isBottomNavActive,
  isBottomNavPending,
  resolveNavHref,
} from "@/lib/navigation/active";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useDockScrollHide } from "@/hooks/useDockScrollHide";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import {
  IconHome,
  IconListen,
  IconLive,
  IconMenu,
  IconReels,
} from "@/components/navigation/NavIcons";

const ICONS: Record<
  Exclude<import("@/lib/navigation").BottomNavIcon, "menu">,
  typeof IconHome
> = {
  home: IconHome,
  listen: IconListen,
  reels: IconReels,
  live: IconLive,
};

const TAB_KEYS: Record<string, keyof ReturnType<typeof useLanguage>["t"]["nav"]> =
  {
    home: "home",
    listen: "listen",
    reels: "shorts",
    live: "live",
    menu: "menu",
  };

function DockIcon({
  tab,
  active,
  isLive,
}: {
  tab: (typeof BOTTOM_NAV_TABS)[number];
  active: boolean;
  isLive?: boolean;
}) {
  if (tab.icon === "menu") {
    return <IconMenu className="mobile-dock__icon" />;
  }
  const Icon = ICONS[tab.icon];
  if (!Icon) return null;

  return (
    <span
      className={`mobile-dock__icon-wrap${active ? " is-active" : ""}${isLive ? " mobile-dock__icon-wrap--live" : ""}`}
    >
      <Icon className="mobile-dock__icon" />
    </span>
  );
}

export function BottomMobileNav() {
  const { pathname, hash, pendingPath, startNavigation, menuOpen, toggleMenu } =
    useNavigation();
  const { t } = useLanguage();
  const isStory = pathname.startsWith("/story/");
  const scrollHidden = useDockScrollHide(!isStory);

  if (isStory) return null;

  return (
    <nav
      className={`mobile-dock md:hidden${scrollHidden ? " mobile-dock--hidden" : ""}`}
      aria-label="Main"
    >
      <div className="mobile-dock__shell">
        <div className="mobile-dock__pill">
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
                  className={`mobile-dock__item mobile-dock__item--menu tap-press${active ? " is-active" : ""}`}
                  aria-expanded={menuOpen}
                  aria-haspopup="dialog"
                  aria-label={label}
                  onClick={() => {
                    triggerHaptic("selection");
                    toggleMenu();
                  }}
                >
                  <DockIcon tab={tab} active={active} />
                  <span className="mobile-dock__label">{label}</span>
                </button>
              );
            }

            const href = resolveNavHref(tab.href, pathname);

            return (
              <Link
                key={tab.id}
                href={href}
                prefetch={tab.id === "home"}
                className={`mobile-dock__item tap-press${active ? " is-active" : ""}${isLive ? " mobile-dock__item--live" : ""}${pendingPath === tab.href ? " is-pending" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  triggerHaptic(isLive ? "medium" : "selection");
                  startNavigation(href);
                }}
              >
                <DockIcon tab={tab} active={active} isLive={isLive} />
                <span className="mobile-dock__label">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
