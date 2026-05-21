import type { ReadingMemory } from "./reading-memory";
import { HERO_ARTICLE_SLUG } from "./articles";

export type CuriosityStep = {
  slug: string;
  kicker: string;
  title: string;
  reason: string;
};

const TRAILS: Record<string, CuriosityStep[]> = {
  [HERO_ARTICLE_SLUG]: [
    {
      slug: "coal-auction-transparency",
      kicker: "Politics desk",
      title: "Coal auction transparency",
      reason:
        "The assembly filing extends the investigation into who controls the public record.",
    },
    {
      slug: "school-on-the-highway",
      kicker: "Education",
      title: "The school beside the highway",
      reason:
        "Readers who finish Naya Raipur often read this next — civic patience in another register.",
    },
  ],
  "school-on-the-highway": [
    {
      slug: HERO_ARTICLE_SLUG,
      kicker: "Investigations",
      title: "When the Naya Raipur file went missing",
      reason: "The lead investigation shares the same question of institutional memory.",
    },
  ],
  default: [
    {
      slug: HERO_ARTICLE_SLUG,
      kicker: "Lead filing",
      title: "When the Naya Raipur file went missing",
      reason: "Today's edition opens with the Investigations desk.",
    },
    {
      slug: "school-on-the-highway",
      kicker: "Longform",
      title: "The school that teaches beside the highway",
      reason: "A measured descent — education filed from Durg.",
    },
  ],
};

function readSlugs(memory: ReadingMemory): Set<string> {
  return new Set(
    Object.entries(memory.articles)
      .filter(([, v]) => v.progress > 0.25)
      .map(([s]) => s)
  );
}

export function getCuriosityTrail(
  memory: ReadingMemory,
  currentSlug?: string
): CuriosityStep[] {
  const read = readSlugs(memory);
  const base = (currentSlug && TRAILS[currentSlug]) || TRAILS.default;
  return base
    .filter((step) => step.slug !== currentSlug && !read.has(step.slug))
    .slice(0, 2);
}

export function getTrailForHomepage(memory: ReadingMemory): CuriosityStep[] {
  const read = readSlugs(memory);
  const lastSlug = memory.lastSlug;

  if (lastSlug && memory.articles[lastSlug]?.progress < 0.98) {
    const continueStep: CuriosityStep = {
      slug: lastSlug,
      kicker: "आपकी जगह संस्करण में",
      title: memory.articles[lastSlug].title,
      reason: "You left a story unfinished. The desk held your position.",
    };
    const adjacent = (TRAILS[lastSlug] ?? TRAILS.default).find(
      (s) => s.slug !== lastSlug && !read.has(s.slug)
    );
    return adjacent ? [continueStep, adjacent] : [continueStep];
  }

  if (
    Object.keys(memory.sections).includes("investigations") &&
    !read.has(HERO_ARTICLE_SLUG)
  ) {
    return TRAILS.default.slice(0, 2);
  }

  return TRAILS.default.filter((s) => !read.has(s.slug)).slice(0, 2);
}
