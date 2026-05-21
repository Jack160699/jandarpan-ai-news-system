export type AppLanguage = "en" | "hi" | "cg";

export const APP_LANGUAGES: AppLanguage[] = ["en", "hi", "cg"];

export type LanguageOption = {
  id: AppLanguage;
  label: string;
  native: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: "en", label: "English", native: "English" },
  { id: "hi", label: "Hindi", native: "हिन्दी" },
  { id: "cg", label: "Chhattisgarhi", native: "छत्तीसगढ़ी" },
];

export type Dictionary = {
  brand: {
    tagline: string;
    conceptNote: string;
  };
  gate: {
    editionLabel: string;
    title: string;
    subtitle: string;
    description: string;
    confirm: string;
  };
  header: {
    search: string;
    changeLanguage: string;
    darkMode: string;
    lightMode: string;
    languageSheetTitle: string;
  };
  nav: {
    topNews: string;
    chhattisgarh: string;
    raipur: string;
    politics: string;
    crime: string;
    sports: string;
    business: string;
    education: string;
    home: string;
    video: string;
    live: string;
    saved: string;
    profile: string;
  };
  common: {
    all: string;
    breaking: string;
    live: string;
    breakingLabel: string;
    minRead: string;
  };
  home: {
    topHeadlines: string;
    trending: string;
    liveDesk: string;
    wire: string;
    latestNews: string;
    cityUpdates: string;
    quickRead: string;
    investigations: string;
    opinion: string;
    categories: {
      politics: string;
      chhattisgarh: string;
      sports: string;
      business: string;
    };
    cities: {
      raipur: string;
      bastar: string;
      bhilai: string;
    };
  };
  article: {
    back: string;
    endOfFiling: string;
    returnToEdition: string;
    related: string;
    bookmark: string;
    bookmarked: string;
  };
  ribbon: {
    continue: string;
    resume: string;
    dismiss: string;
  };
  search: {
    title: string;
    placeholder: string;
    hint: string;
  };
  archive: {
    backToEdition: string;
    marker: string;
    title: string;
    description: string;
    livingArchive: string;
  };
  footer: {
    institution: string;
    newsroom: string;
    record: string;
    livingArchive: string;
    ethics: string;
    contact: string;
    copyright: string;
  };
};
