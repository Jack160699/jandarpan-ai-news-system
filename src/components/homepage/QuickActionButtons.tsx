"use client";

import Link from "next/link";
import { Bookmark, Radio, Search, Clapperboard } from "lucide-react";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";
import { triggerHaptic } from "@/lib/mobile/haptics";

const ICON_STROKE = {
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

type ActionItem = {
  id: string;
  href: string;
  labelKey: keyof ReturnType<typeof useLanguage>["t"]["nav"];
  Icon: typeof Clapperboard;
  live?: boolean;
};

/** Compact shortcut rail — no Listen (lives in bottom dock) */
const ACTIONS: ActionItem[] = [
  { id: "shorts", href: "/shorts", labelKey: "shorts", Icon: Clapperboard },
  { id: "live", href: "/live", labelKey: "live", Icon: Radio, live: true },
  { id: "saved", href: "/archive", labelKey: "savedStories", Icon: Bookmark },
  { id: "search", href: "/search", labelKey: "search", Icon: Search },
];

export function QuickActionButtons() {
  const { startNavigation } = useNavigation();
  const { t } = useLanguage();

  return (
    <nav className="quick-actions quick-actions--dock" aria-label="Quick actions">
      {ACTIONS.map((action) => {
        const Icon = action.Icon;
        return (
          <Link
            key={action.id}
            href={action.href}
            className={`quick-actions__btn${action.live ? " quick-actions__btn--live" : ""}`}
            onClick={() => {
              triggerHaptic(action.live ? "medium" : "selection");
              startNavigation(action.href);
            }}
          >
            <span className="quick-actions__icon" aria-hidden>
              <Icon className="quick-actions__svg" {...ICON_STROKE} />
            </span>
            <span className="quick-actions__label">{t.nav[action.labelKey]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
