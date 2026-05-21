import { useReaderPreferencesOptional } from "@/providers/ReaderPreferencesProvider";

type LocalizedFields = {
  title: string;
  titleHi?: string;
  kicker: string;
  kickerHi?: string;
};

export function useLocalizedHeadline(fields: LocalizedFields) {
  const reader = useReaderPreferencesOptional();
  const lang = reader?.prefs.language ?? "hi";

  if (lang === "en") {
    return {
      title: fields.title,
      kicker: fields.kicker,
      showHindiSub: Boolean(fields.titleHi),
      hindiSub: fields.titleHi,
    };
  }

  if (lang === "cg") {
    return {
      title: fields.titleHi ?? fields.title,
      kicker: fields.kickerHi ?? fields.kicker,
      showHindiSub: true,
      hindiSub: fields.title,
    };
  }

  return {
    title: fields.titleHi ?? fields.title,
    kicker: fields.kickerHi ?? fields.kicker,
    showHindiSub: Boolean(fields.title),
    hindiSub: fields.title,
  };
}
