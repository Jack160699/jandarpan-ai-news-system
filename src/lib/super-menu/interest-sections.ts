import type { HomeSectionId } from "@/lib/homepage/types";

const INTEREST_SECTION_MAP: Record<string, HomeSectionId[]> = {
  politics: ["india"],
  cricket: ["sports"],
  business: ["business"],
  "cg-news": ["chhattisgarh"],
  raipur: ["raipur"],
  education: ["education"],
  stocks: ["business", "india"],
  gold: ["business"],
  jobs: ["education", "india"],
  technology: ["education"],
  entertainment: ["india"],
  farming: ["chhattisgarh"],
  weather: ["chhattisgarh", "raipur"],
  "live-tv": ["chhattisgarh"],
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
