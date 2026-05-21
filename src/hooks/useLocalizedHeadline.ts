import { localizeFeedStory } from "@/lib/i18n/localize-content";
import { useLanguageOptional } from "@/providers/LanguageProvider";

type LocalizedFields = {
  title: string;
  titleHi?: string;
  kicker: string;
  kickerHi?: string;
  excerpt?: string;
};

export function useLocalizedHeadline(fields: LocalizedFields) {
  const lang = useLanguageOptional()?.language ?? "hi";

  const localized = localizeFeedStory(
    {
      slug: "",
      title: fields.title,
      titleHi: fields.titleHi,
      kicker: fields.kicker,
      kickerHi: fields.kickerHi,
      excerpt: fields.excerpt ?? "",
      image: "",
      readTime: "",
      filedAt: "",
    },
    lang
  );

  return {
    title: localized.title,
    kicker: localized.kicker,
    showHindiSub: localized.showSecondary,
    hindiSub: localized.secondaryTitle,
  };
}
