"use client";

import Link from "next/link";
import {
  Clapperboard,
  Headphones,
  MapPin,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { SectionHeader } from "@/design-system/components/SectionHeader";
import { useLanguage } from "@/providers/LanguageProvider";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import {
  getSeoHomepagePrimaryClusters,
} from "@/lib/seo/homepage-hub";
import { NAV_CATEGORIES } from "@/lib/navigation";
import { useReaderPreferences } from "@/providers/ReaderPreferencesProvider";

const EXPLORE_QUICK = [
  { id: "reels", label: "Reels", href: "/shorts", icon: Clapperboard },
  { id: "audio", label: "Audio", href: "/listen", icon: Headphones },
  { id: "search", label: "Search", href: "/search", icon: Search },
  { id: "ai", label: "AI Search", href: "#", icon: Sparkles, action: "palette" as const },
] as const;

export function ExploreSection() {
  const { language } = useLanguage();
  const clusters = getSeoHomepagePrimaryClusters().slice(0, 6);
  const categories = NAV_CATEGORIES.slice(0, 6);
  const { setSearchOpen } = useReaderPreferences();

  return (
    <section
      className="home-v3__section home-v3__enter"
      aria-labelledby="home-v3-explore-title"
    >
      <SectionHeader title="Explore" kicker="Discover" />
      <h2 id="home-v3-explore-title" className="sr-only">
        Explore
      </h2>

      <div className="home-v3-explore-grid">
        {EXPLORE_QUICK.map((item) => {
          const Icon = item.icon;
          if ("action" in item && item.action === "palette") {
            return (
              <button
                key={item.id}
                type="button"
                className="home-v3-explore-card text-left"
                onClick={() => setSearchOpen(true)}
              >
                <Icon size={20} className="text-[var(--jds-color-ai)]" aria-hidden />
                <span className="home-v3-explore-card__title">{item.label}</span>
                <span className="home-v3-explore-card__desc">⌘K command palette</span>
              </button>
            );
          }
          return (
            <Link key={item.id} href={item.href} className="home-v3-explore-card">
              <Icon size={20} className="text-[var(--jds-color-brand-primary)]" aria-hidden />
              <span className="home-v3-explore-card__title">{item.label}</span>
            </Link>
          );
        })}

        {categories.map((cat) => (
          <Link key={cat.id} href={cat.href} className="home-v3-explore-card">
            <Tag size={20} className="text-[var(--jds-color-text-tertiary)]" aria-hidden />
            <span className="home-v3-explore-card__title">
              {pickBilingualLabel(language, cat.label, cat.labelHi ?? cat.label)}
            </span>
          </Link>
        ))}

        {clusters.map((cluster) => (
          <Link key={cluster.id} href={cluster.path} className="home-v3-explore-card">
            <MapPin size={20} className="text-[var(--jds-color-government)]" aria-hidden />
            <span className="home-v3-explore-card__title">
              {pickBilingualLabel(language, cluster.titleEn, cluster.titleHi)}
            </span>
            <span className="home-v3-explore-card__desc line-clamp-2">
              {pickBilingualLabel(language, cluster.descriptionEn, cluster.descriptionHi)}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
