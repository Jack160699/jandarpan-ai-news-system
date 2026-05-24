/**
 * Redis / edge micro-cache key namespace
 */

export const NEWS_CACHE_KEYS = {
  homepage: "news:homepage",
  breaking: "news:breaking",
  regional: "news:regional",
  wireNormalized: "news:wire:normalized",
  staleSnapshot: "news:snapshot:last-success",
  providerCircuit: "news:provider:circuit",
} as const;

export type NewsCacheSegment = keyof typeof NEWS_CACHE_KEYS;
