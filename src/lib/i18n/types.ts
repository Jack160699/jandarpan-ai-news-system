import { NEWSROOM_LANGUAGES, type NewsroomLanguage } from "@/lib/i18n/languages";

/** App UI + reader language (6 Indian regional languages) */
export type AppLanguage = NewsroomLanguage;

export const APP_LANGUAGES: AppLanguage[] = [...NEWSROOM_LANGUAGES];

export type { LanguageOption } from "@/lib/i18n/languages";
export { LANGUAGE_OPTIONS } from "@/lib/i18n/languages";

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
    live: string;
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
    reels: string;
    shorts: string;
    live: string;
    saved: string;
    profile: string;
    you: string;
    districts: string;
    search: string;
    menu: string;
    trendingShort: string;
    categoriesTitle: string;
    districtsTitle: string;
    savedStories: string;
    theme: string;
    listen: string;
  };
  cardActions: {
    groupLabel: string;
    whatsapp: string;
    share: string;
    listen: string;
    pause: string;
    resume: string;
    like: string;
    liked: string;
    comment: string;
  };
  common: {
    all: string;
    breaking: string;
    live: string;
    breakingLabel: string;
    minRead: string;
    loading: string;
    error: string;
    retry: string;
    more: string;
    seeAll: string;
    developing: string;
    justNow: string;
    today: string;
    share: string;
    copyLink: string;
    linkCopied: string;
    shareFailed: string;
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
    mastheadTagline: string;
    cgUpdates: string;
    moreToday: string;
    hyperlocal: string;
    reels: string;
    emptyTitle: string;
    emptyBody: string;
    loadingEdition: string;
    tickerAria: string;
    tickerFallback: string;
    fresh: string;
    liveNewsroom: string;
    updatedPrefix: string;
    newUpdatesAvailable: string;
    refreshFeed: string;
    dismissUpdates: string;
    globalBrief: string;
    nationalNewsTab: string;
    internationalNewsTab: string;
    nationalSegmentEmpty: string;
    allUpdates: string;
    districtWire: string;
    districtLive: string;
    districtLivePrefix: string;
    districtLiveStoriesLabel: string;
    districtEmpty: string;
    districtStories: string;
    featuredDistricts: {
      bilaspur: string;
      raipur: string;
      durg: string;
      raigarh: string;
      korba: string;
      jagdalpur: string;
    };
    categories: {
      politics: string;
      chhattisgarh: string;
      sports: string;
      business: string;
      india: string;
      world: string;
      education: string;
      raipur: string;
    };
    cities: {
      raipur: string;
      bastar: string;
      bhilai: string;
    };
  };
  live: {
    title: string;
    subtitle: string;
    wire: string;
    latest: string;
    updating: string;
    viewAll: string;
  };
  listen: {
    title: string;
    subtitle: string;
    play: string;
    pause: string;
  };
  shorts: {
    title: string;
    subtitle: string;
    trending: string;
    watch: string;
    backHome: string;
    readFull: string;
    mute: string;
    unmute: string;
    play: string;
    pause: string;
    share: string;
    bookmark: string;
    bookmarked: string;
    empty: string;
    loading: string;
    swipeHint: string;
    narration: string;
    narrationShort: string;
    feedAria: string;
    actionsAria: string;
  };
  article: {
    back: string;
    endOfFiling: string;
    returnToEdition: string;
    related: string;
    bookmark: string;
    bookmarked: string;
    edition: string;
    savedToast: string;
    removedToast: string;
    keyPoints: string;
    transparencyTitle: string;
    transparencyBody: string;
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
    noResults: string;
    searching: string;
    recentSearches?: string;
    seeAllResults?: string;
    clearHistory?: string;
  };
  archive: {
    backToEdition: string;
    marker: string;
    title: string;
    description: string;
    livingArchive: string;
    empty: string;
  };
  profile: {
    title: string;
    subtitle: string;
    settings: string;
    appearanceHint: string;
    notifications: string;
    notificationsHint: string;
    listenHint: string;
    region: string;
    regionHint: string;
  };
  trust: {
    verified: string;
    reviewed: string;
    regionalNetwork: string;
    fastUpdates: string;
    multiSource: string;
  };
  story: {
    keyPoints: string;
    deskNoteKicker: string;
    deskNoteBody: string;
    deskNoteFine: string;
    disclaimerTitle: string;
    disclaimerBody: string;
    relatedStories: string;
    trendingNow: string;
    liveUpdating: string;
  };
  footer: {
    networkName: string;
    mission: string;
    sectionsTitle: string;
    newsroomTitle: string;
    districtsTitle: string;
    standardsTitle: string;
    contactTitle: string;
    followTitle: string;
    taglineFooter: string;
    quickLinksTitle: string;
    todayLive: {
      title: string;
      liveBadge: string;
      timezone: string;
      defaultBreaking: string;
      defaultLocal: string;
    };
    publisherLine: string;
    corrections: string;
    editorialEmail: string;
    tipsEmail: string;
    ethicsLink: string;
    standardsLink: string;
    livingArchive: string;
    trendingTitle: string;
    copyright: string;
    newsTips: string;
    links: {
      business: string;
      sports: string;
      jobs: string;
      technology: string;
      politics: string;
      entertainment: string;
      education: string;
      startup: string;
      agriculture: string;
      crime: string;
    };
  };
  ptr: {
    pull: string;
    release: string;
    refreshing: string;
  };
  fab: {
    scrollTop: string;
    listen: string;
    live: string;
  };
};
