"use client";

import Link from "next/link";
import {
  Clapperboard,
  Headphones,
  MapPin,
  Search,
  Sparkles,
  Sun,
} from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { NAV_CATEGORIES } from "@/lib/navigation";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";
import { isMorningBriefEnabled } from "@/lib/morning-brief/config";

type DiscoverStripSectionProps = {
  listenArticleIds: string[];
};

const QUICK_LINKS = [
  { id: "shorts", icon: Clapperboard, href: "/shorts", labelEn: "Shorts", labelHi: "शॉर्ट्स" },
  { id: "listen", icon: Headphones, href: "/listen", labelEn: "Listen", labelHi: "सुनें" },
  { id: "search", icon: Search, href: "/search", labelEn: "Search", labelHi: "खोजें" },
  { id: "ai", icon: Sparkles, href: null, labelEn: "AI", labelHi: "AI", action: "palette" as const },
] as const;

export function DiscoverStripSection({ listenArticleIds }: DiscoverStripSectionProps) {
  const { language } = useLanguage();
  const { setSearchOpen } = useReaderPreferences();
  const morningBriefEnabled = isMorningBriefEnabled();

  const listenHref =
    listenArticleIds.length > 0
      ? `/listen?ids=${listenArticleIds.slice(0, 5).join(",")}`
      : "/listen";

  return (
    <section
      className="home-v31__section home-v31__enter"
      aria-labelledby="home-v31-discover-title"
    >
      <SectionHeader
        title={pickBilingualLabel(language, "Discover", "खोजें")}
        kicker={pickBilingualLabel(language, "More", "और")}
      />
      <h2 id="home-v31-discover-title" className="sr-only">
        Discover
      </h2>

      <div className="home-v31-discover-rail" role="list">
        {morningBriefEnabled ? (
          <Link
            href="/morning-brief"
            className="home-v31-discover-chip tap-target"
            role="listitem"
          >
            <Sun size={16} aria-hidden />
            <span>{pickBilingualLabel(language, "Brief", "संक्षेप")}</span>
          </Link>
        ) : null}

        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          const label = pickBilingualLabel(language, item.labelEn, item.labelHi);
          const href =
            item.id === "listen"
              ? listenHref
              : item.href ?? "/search";

          if ("action" in item && item.action === "palette") {
            return (
              <button
                key={item.id}
                type="button"
                className="home-v31-discover-chip home-v31-discover-chip--ai tap-target"
                role="listitem"
                onClick={() => setSearchOpen(true)}
              >
                <Icon size={16} aria-hidden />
                <span>{label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.id}
              href={href}
              className="home-v31-discover-chip tap-target"
              role="listitem"
            >
              <Icon size={16} aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}

        {NAV_CATEGORIES.slice(0, 5).map((cat) => (
          <Link
            key={cat.id}
            href={cat.href}
            className="home-v31-discover-chip tap-target"
            role="listitem"
          >
            <MapPin size={16} aria-hidden />
            <span>
              {pickBilingualLabel(language, cat.label, cat.labelHi ?? cat.label)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
