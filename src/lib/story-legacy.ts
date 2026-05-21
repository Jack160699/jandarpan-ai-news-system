export type LegacyUpdate = {
  date: string;
  label: string;
};

export type StoryLegacy = {
  slug: string;
  threadId: string;
  threadTitle: string;
  started: string;
  lastUpdated: string;
  status: "ongoing" | "concluded" | "watching";
  chapters: { number: number; label: string; filed?: string }[];
  updates: LegacyUpdate[];
  archiveRef?: string;
};

export const STORY_LEGACY: Record<string, StoryLegacy> = {
  "naya-raipur-file": {
    slug: "naya-raipur-file",
    threadId: "thread-naya-raipur",
    threadTitle: "Naya Raipur · Land & record",
    started: "March 2026",
    lastUpdated: "May 21, 2026",
    status: "ongoing",
    archiveRef: "CGB-2026-INV-0412",
    chapters: [
      { number: 1, label: "The missing register", filed: "May 18" },
      { number: 2, label: "The backup drive", filed: "May 20" },
      { number: 3, label: "The queue returns", filed: "May 21" },
    ],
    updates: [
      { date: "May 21, 2026", label: "Chapter III · State desk cross-reference filed" },
      { date: "May 20, 2026", label: "Access logs obtained · Expanded testimony" },
      { date: "May 18, 2026", label: "Lead filing · Investigations desk" },
    ],
  },
  "school-on-the-highway": {
    slug: "school-on-the-highway",
    threadId: "thread-education-durg",
    threadTitle: "Education · Durg district",
    started: "January 2025",
    lastUpdated: "May 2026",
    status: "watching",
    archiveRef: "CGB-2026-EDU-0088",
    chapters: [
      { number: 1, label: "The highway school" },
      { number: 2, label: "Inspection that did not arrive", filed: "2025" },
    ],
    updates: [
      { date: "May 2026", label: "Longform refresh for concept edition" },
      { date: "January 2025", label: "Original dispatch" },
    ],
  },
};

export function getStoryLegacy(slug: string): StoryLegacy | undefined {
  return STORY_LEGACY[slug];
}
