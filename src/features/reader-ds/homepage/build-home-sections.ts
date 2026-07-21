import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import type { ReaderStory } from "../utils";
import type { JdDsStringKey } from "../i18n";

export type HomeSection = {
  key: string;
  title: string;
  color: string;
  moreHref: string;
  stories: ReaderStory[];
};

const SECTION_COLORS = ["var(--jd-red)", "var(--jd-navy)", "var(--jd-gold)", "var(--jd-ok)"];

export function toStory(a: HomeArticle): ReaderStory {
  return {
    slug: a.slug,
    headline: a.headline,
    kicker: a.categoryLabel || a.desk?.nameHi || a.desk?.name,
    summary: a.summary,
    imageUrl: a.imageUrl,
    publishedAt: a.publishedAt,
    isLive: a.isLive,
  };
}

/**
 * Build homepage news sections from real feed content only.
 * Empty / thin sections are suppressed. Duplicate slugs are minimized.
 */
export function buildHomeSections(
  feed: GeneratedHomepageFeed,
  excludeSlugs: Set<string>,
  t: (key: JdDsStringKey) => string,
  opts?: { maxSections?: number; minStories?: number }
): HomeSection[] {
  const maxSections = opts?.maxSections ?? 14;
  const minStories = opts?.minStories ?? 2;
  const seen = new Set(excludeSlugs);

  const take = (pool: HomeArticle[] | undefined, n: number): ReaderStory[] => {
    const out: ReaderStory[] = [];
    for (const a of pool ?? []) {
      if (!a?.slug || !a.headline?.trim() || seen.has(a.slug)) continue;
      seen.add(a.slug);
      out.push(toStory(a));
      if (out.length >= n) break;
    }
    return out;
  };

  const pushIfEnough = (
    sections: HomeSection[],
    section: HomeSection,
    min = minStories
  ) => {
    if (section.stories.length >= min && sections.length < maxSections) {
      sections.push(section);
    }
  };

  const sections: HomeSection[] = [];

  // 1. मुख्य / शीर्ष खबरें
  const top = take(
    [
      ...(feed.editorsPicks?.supporting ?? []),
      ...(feed.trending ?? []),
      ...(feed.liveWire ?? []),
    ],
    4
  );
  pushIfEnough(
    sections,
    {
      key: "top",
      title: t("home.topStories"),
      color: SECTION_COLORS[0],
      moreHref: "/latest",
      stories: top,
    },
    1
  );

  // 2. मेरा जिला
  const regional = take(feed.regionalHighlights, 4);
  pushIfEnough(
    sections,
    {
      key: "regional",
      title: t("home.district"),
      color: SECTION_COLORS[1],
      moreHref: "/district",
      stories: regional,
    },
    1
  );

  // 3. सर्वाधिक पढ़ी / ट्रेंडिंग (if not already consumed)
  const mostRead = take(feed.trending, 4);
  pushIfEnough(
    sections,
    {
      key: "most-read",
      title: t("home.mostRead"),
      color: SECTION_COLORS[0],
      moreHref: "/trending",
      stories: mostRead,
    },
    2
  );

  // 4. संपादक की पसंद
  const editorsPool = [
    feed.editorsPicks?.lead,
    ...(feed.editorsPicks?.supporting ?? []),
  ].filter(Boolean) as HomeArticle[];
  const editors = take(editorsPool, 4);
  pushIfEnough(
    sections,
    {
      key: "editors",
      title: t("home.editorsPicks"),
      color: SECTION_COLORS[2],
      moreHref: "/latest",
      stories: editors,
    },
    2
  );

  // 5. Category streams (taxonomy-backed)
  for (const stream of feed.categoryStreams ?? []) {
    if (sections.length >= maxSections) break;
    const stories = take(stream.articles, 4);
    pushIfEnough(sections, {
      key: `cat-${stream.id}`,
      title: stream.labelHi || stream.label,
      color: SECTION_COLORS[sections.length % SECTION_COLORS.length],
      moreHref: `/category/${stream.id}`,
      stories,
    });
  }

  // 6. Editorial desks when present
  for (const desk of feed.editorialDesks ?? []) {
    if (desk.collapsed || sections.length >= maxSections) continue;
    const stories = take(desk.articles, 4);
    pushIfEnough(sections, {
      key: `desk-${desk.id}`,
      title: desk.labelHi || desk.label,
      color: SECTION_COLORS[sections.length % SECTION_COLORS.length],
      moreHref: "/latest",
      stories,
    });
  }

  // 7. नवीनतम (live wire remainder)
  const latest = take(feed.liveWire, 4);
  pushIfEnough(
    sections,
    {
      key: "latest",
      title: t("home.latest"),
      color: SECTION_COLORS[1],
      moreHref: "/latest",
      stories: latest,
    },
    2
  );

  // 8. सुनें — only when listen pool maps to known articles with headlines
  if (feed.listenArticleIds?.length) {
    const listenIdSet = new Set(feed.listenArticleIds);
    const listenPool = [
      ...(feed.liveWire ?? []),
      ...(feed.trending ?? []),
      ...(feed.regionalHighlights ?? []),
      ...(feed.editorsPicks?.supporting ?? []),
      feed.editorsPicks?.lead,
    ].filter((a): a is HomeArticle => Boolean(a && listenIdSet.has(a.id)));
    const listenStories = take(listenPool, 4);
    pushIfEnough(
      sections,
      {
        key: "listen",
        title: t("nav.listen"),
        color: SECTION_COLORS[3],
        moreHref: "/listen",
        stories: listenStories,
      },
      2
    );
  }

  return sections.slice(0, maxSections);
}

/** Count duplicate slug reuse across rendered homepage story slots (should stay low). */
export function countDuplicateSlugs(slugs: string[]): number {
  const seen = new Set<string>();
  let dupes = 0;
  for (const s of slugs) {
    if (!s) continue;
    if (seen.has(s)) dupes += 1;
    else seen.add(s);
  }
  return dupes;
}
