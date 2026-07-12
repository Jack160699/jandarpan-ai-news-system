export type MorningBriefBreakingItem = {
  id: string;
  headline: string;
  slug?: string;
  category?: string;
  publishedAt?: string;
};

export type MorningBriefWeather = {
  location: string;
  condition: string;
  temperatureC: number;
  highC: number;
  lowC: number;
  humidity?: number;
  placeholder?: boolean;
};

export type MorningBriefListItem = {
  id: string;
  title: string;
  summary?: string;
  meta?: string;
  href?: string;
};

export type MorningBriefAudioTrack = {
  id: string;
  title: string;
  durationSec: number;
  categoryLabel?: string;
};

export type MorningBriefData = {
  breaking: MorningBriefBreakingItem[];
  weather: MorningBriefWeather;
  government: MorningBriefListItem[];
  jobs: MorningBriefListItem[];
  traffic: MorningBriefListItem[];
  events: MorningBriefListItem[];
  aiSummary: string;
  audioTracks: MorningBriefAudioTrack[];
  listenArticleIds: string[];
};
