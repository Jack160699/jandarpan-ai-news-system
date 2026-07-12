"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio, Home, MapPin, User } from "lucide-react";
import { cn } from "@/design-system/utils/cn";
import { useLanguage } from "@/providers/LanguageProvider";
import { useLive } from "@/providers/LiveProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { usePlace } from "@/providers/PlaceProvider";
import { triggerHaptic } from "@/lib/mobile/haptics";
import { useShellScrollHide } from "../hooks/useShellScrollHide";

type TabId = "today" | "place" | "live" | "you";

/**
 * Bottom navigation — exactly 4 tabs: Today / {place} / Live / You.
 * Active tab: blue icon+label, 2px top indicator, aria-current="page".
 * Live carries the product's one badge — a red dot, only while liveInPlace.
 */
export function BottomNavigation({ hidden }: { hidden?: boolean }) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const place = usePlace();
  const { liveInPlace } = useLive();
  const { startNavigation } = useNavigation();
  const scrollHidden = useShellScrollHide(!hidden);

  const isHidden = hidden || scrollHidden;

  const activeId: TabId | null = (() => {
    if (pathname === "/") return "today";
    if (pathname.startsWith("/district")) return "place";
    if (pathname.startsWith("/live")) return "live";
    if (pathname.startsWith("/you") || pathname.startsWith("/profile")) return "you";
    return null;
  })();

  if (hidden) return null;

  const tabs: Array<{
    id: TabId;
    href: string;
    label: string;
    Icon: typeof Home;
    showLiveDot?: boolean;
  }> = [
    { id: "today", href: "/", label: t.common.today, Icon: Home },
    { id: "place", href: place.href, label: place.shortName, Icon: MapPin },
    {
      id: "live",
      href: "/live",
      label: t.nav.live,
      Icon: Radio,
      showLiveDot: liveInPlace,
    },
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
                triggerHaptic(tab.id === "live" ? "medium" : "selection");
                startNavigation(tab.href);
              }}
            >
              <span className="jdp-bottomnav__icon-wrap">
                <tab.Icon className="jdp-bottomnav__icon" aria-hidden />
                {tab.showLiveDot ? (
                  <span className="jdp-bottomnav__badge" aria-hidden />
                ) : null}
              </span>
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
