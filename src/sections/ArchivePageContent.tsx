"use client";

import Link from "next/link";
import { EditionLineage } from "@/components/institution";
import { ProfileSettingsPanel } from "@/components/profile/ProfileSettingsPanel";
import { ReadingHistoryPanel } from "@/components/reader/ReadingHistoryPanel";
import { SavedStoriesPanel } from "@/components/reader/SavedStoriesPanel";
import { pickBilingualLabel } from "@/lib/i18n/pick-label";
import { useLanguage } from "@/providers/LanguageProvider";

export function ArchivePageContent() {
  const { t, language } = useLanguage();

  return (
    <main
      data-narrative-root
      className="home-news-flow mobile-comfort relative z-[2] pb-24 pt-6 md:pt-10"
    >
      <div className="editorial-container">
        <Link href="/" className="article-page__back tap-target">
          {t.archive.backToEdition}
        </Link>
        <h1 className="display-lg mt-6 max-w-[16ch]">{t.profile.title}</h1>
        <p className="deck mt-4 max-w-2xl">{t.profile.subtitle}</p>
        <EditionLineage className="mt-6" />
      </div>

      <div className="editorial-container mt-10">
        <ProfileSettingsPanel />
      </div>

      <div className="editorial-container mt-12" id="saved-stories">
        <h2 className="profile-settings__saved-heading">{t.nav.savedStories}</h2>
        <p className="deck mt-3 max-w-2xl">{t.archive.description}</p>
        <SavedStoriesPanel />
      </div>

      <div className="editorial-container mt-12">
        <h2 className="profile-settings__saved-heading">
          {pickBilingualLabel(language, "Reading history", "पढ़ने का इतिहास")}
        </h2>
        <p className="deck mt-3 max-w-2xl">
          {pickBilingualLabel(
            language,
            "Continue where you left off. Progress is saved on this device.",
            "जहाँ छोड़ा था वहीं से पढ़ें। प्रगति इस डिवाइस पर सहेजी जाती है।"
          )}
        </p>
        <ReadingHistoryPanel />
      </div>
    </main>
  );
}
