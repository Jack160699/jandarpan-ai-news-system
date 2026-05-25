/** ISR / cache windows — edge-ready constants */

export const ISR = {
  homepage: 60,
  breaking: 30,
  district: 120,
  globalBrief: 90,
  topicHub: 300,
  article: 180,
} as const;

export const CACHE_TAGS = {
  breaking: "nr-breaking",
  district: (slug: string) => `nr-district-${slug}`,
  globalBrief: (seg: string) => `nr-global-${seg}`,
  topic: (slug: string) => `nr-topic-${slug}`,
  homepage: "nr-homepage",
} as const;
