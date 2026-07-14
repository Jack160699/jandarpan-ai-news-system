"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clapperboard, Home, MapPin, Newspaper, User } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useShellScrollHide } from "../hooks/useShellScrollHide";

type TabId = "home" | "district" | "shorts" | "news" | "you";

/**
 * Bottom navigation — exactly 4 tabs: Today / {place} / Live / You.
 * Active tab: blue icon+label, 2px top indicator, aria-current="page".
 * Live carries the product's one badge — a red dot, only while liveInPlace.
 */
export function BottomNavigation({ hidden }: { hidden?: boolean }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { startNavigation } = useNavigation();
  const scrollHidden = useShellScrollHide(!hidden);

  const isHidden = hidden || scrollHidden;

  const activeId: TabId | null = (() => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/district") || pathname.startsWith("/places")) return "district";
    if (pathname.startsWith("/shorts")) return "shorts";
    if (pathname.startsWith("/category") || pathname.startsWith("/news/")) return "news";
    if (pathname.startsWith("/you") || pathname.startsWith("/profile")) return "you";
    return null;
  })();

  if (hidden) return null;

  const tabs: Array<{
    id: TabId;
    href: string;
    label: string;
    Icon: typeof Home;
  }> = [
    { id: "home", href: "/", label: t.nav.home, Icon: Home },
    { id: "district", href: "/places", label: t.nav.districts, Icon: MapPin },
    { id: "shorts", href: "/shorts", label: t.nav.shorts, Icon: Clapperboard },
    { id: "news", href: "/category/chhattisgarh", label: t.nav.topNews, Icon: Newspaper },
    { id: "you", href: "/you", label: t.nav.you, Icon: User },
  ];

  return (
    <nav
      className={cn("jdp-bottomnav", isHidden && "jdp-bottomnav--hidden")}
      aria-label="Main navigation"
    >
      <div className="jdp-bottomnav__inner">
        {tabs.map((tab) => {
          const isActive = activeId === tab.id;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              data-nav-id={tab.id}
              className={cn(
                "jdp-bottomnav__item",
                isActive && "jdp-bottomnav__item--active"
              )}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                triggerHaptic(tab.id === "shorts" ? "medium" : "selection");
                startNavigation(tab.href);
              }}
            >
              <span className="jdp-bottomnav__icon-wrap">
                <tab.Icon className="jdp-bottomnav__icon" aria-hidden />
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
