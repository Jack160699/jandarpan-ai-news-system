"use client";

import { useLanguage } from "@/providers/LanguageProvider";

export function StoryFooterDisclaimer() {
  const { t } = useLanguage();

  return (
    <footer className="story-disclaimer story-disclaimer--premium">
      <p className="story-disclaimer__standards">{t.story.disclaimerTitle}</p>
      <p className="story-disclaimer__text">{t.story.disclaimerBody}</p>
    </footer>
  );
}
