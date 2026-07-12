"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { EmptyState } from "@/design-system/components/EmptyState";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";
import { useEditorialIntelligenceOptional } from "@/providers/EditorialIntelligenceProvider";
import { ProfileSection } from "./ProfileSection";
import type { ProfileV3Data } from "../types";

export type SavedStoriesSectionProps = {
  data: ProfileV3Data;
};

export function SavedStoriesSection({ data }: SavedStoriesSectionProps) {
  const { language, t } = useLanguage();
  const ctx = useEditorialIntelligenceOptional();

  return (
    <ProfileSection
      id="saved-stories"
      kicker={pickBilingualLabel(language, "Library", "लाइब्रेरी")}
      title={t.nav.savedStories}
      description={t.archive.description}
      action={<Bookmark size={18} className="pv3-section-icon" aria-hidden />}
    >
      {data.saved.length === 0 ? (
        <EmptyState
          title={t.archive.empty}
          description={pickBilingualLabel(
            language,
            "Tap the bookmark icon on any story to save it here on this device.",
            "किसी भी खबर पर बुकमार्क आइकन दबाकर यहाँ सेव करें।"
          )}
          icon="🔖"
        >
          <Link href="/" className="jds-button jds-button--outline jds-button--sm">
            {t.archive.backToEdition}
          </Link>
        </EmptyState>
      ) : (
        <ul className="pv3-saved" aria-label={t.nav.savedStories}>
          {data.saved.map((item) => (
            <li key={item.slug} className="pv3-saved__item">
              <div className="pv3-saved__main">
                <Link href={`/story/${item.slug}`} className="pv3-saved__title">
                  {item.title}
                </Link>
                {item.progress !== null ? (
                  <p className="pv3-saved__meta">
                    {item.progress < 100
                      ? `${item.progress}% ${pickBilingualLabel(language, "read", "पढ़ा")}`
                      : pickBilingualLabel(language, "Finished", "पूरा पढ़ा")}
                  </p>
                ) : null}
              </div>
              {ctx ? (
                <button
                  type="button"
                  className="pv3-saved__remove"
                  onClick={() => ctx.toggleArticleBookmark(item.slug)}
                  aria-label={pickBilingualLabel(
                    language,
                    `Remove ${item.title} from saved stories`,
                    `${item.title} को हटाएं`
                  )}
                >
                  {pickBilingualLabel(language, "Remove", "हटाएं")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </ProfileSection>
  );
}
