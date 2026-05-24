"use client";

import Link from "next/link";
import {
  IconLive,
  IconNewspaper,
  IconSearch,
  IconReels,
} from "@/components/navigation/NavIcons";
import { useLanguage } from "@/providers/LanguageProvider";
import { useNavigation } from "@/providers/NavigationProvider";

type ActionItem = {
  id: string;
  href: string;
  labelKey: keyof ReturnType<typeof useLanguage>["t"]["nav"];
  emoji?: string;
  Icon?: typeof IconReels;
  live?: boolean;
};

const ACTIONS: ActionItem[] = [
  { id: "listen", href: "/listen", labelKey: "listen", emoji: "🎧" },
  { id: "shorts", href: "/shorts", labelKey: "shorts", Icon: IconReels },
  { id: "live", href: "/live", labelKey: "live", Icon: IconLive, live: true },
  { id: "epaper", href: "/archive", labelKey: "saved", Icon: IconNewspaper },
  { id: "search", href: "/search", labelKey: "search", Icon: IconSearch },
];

export function QuickActionButtons() {
  const { startNavigation } = useNavigation();
  const { t } = useLanguage();

  return (
    <nav className="quick-actions" aria-label="Quick actions">
      {ACTIONS.map((action) => {
        const Icon = action.Icon;
        return (
          <Link
            key={action.id}
            href={action.href}
            className={`quick-actions__btn${action.live ? " quick-actions__btn--live" : ""}`}
            onClick={() => startNavigation(action.href)}
          >
            <span className="quick-actions__icon" aria-hidden>
              {action.emoji ? (
                action.emoji
              ) : Icon ? (
                <Icon className="quick-actions__svg" />
              ) : null}
            </span>
            <span className="quick-actions__label">{t.nav[action.labelKey]}</span>
          </Link>
        );
      })}
    </nav>
  );
}
