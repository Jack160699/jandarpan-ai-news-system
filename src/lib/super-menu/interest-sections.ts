import type { HomeSectionId } from "@/lib/homepage/types";

const INTEREST_SECTION_MAP: Record<string, HomeSectionId[]> = {
  politics: ["india"],
  national: ["india"],
  international: ["world"],
  cricket: ["sports"],
  sports: ["sports"],
  business: ["business"],
  "india-news": ["india"],
  raipur: ["raipur"],
  education: ["education"],
  crime: ["india"],
  health: ["education", "india"],
  stocks: ["business", "india"],
  gold: ["business"],
  jobs: ["education", "india"],
  technology: ["education"],
  entertainment: ["india"],
  farming: ["business", "india"],
  weather: ["india"],
  "live-tv": ["india"],
};

/** Map super-menu interest ids to homepage section boosts */
export function sectionsFromFeedInterests(
  interestIds: string[] | undefined
): HomeSectionId[] {
  if (!interestIds?.length) return [];
  const out = new Set<HomeSectionId>();
  for (const id of interestIds) {
    for (const section of INTEREST_SECTION_MAP[id] ?? []) {
      out.add(section);
    }
  }
  return [...out];
}
