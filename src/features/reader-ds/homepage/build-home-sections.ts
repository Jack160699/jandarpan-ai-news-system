import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { resolveCanonicalImage } from "@/lib/news/images/canonical-image-resolver";
import type { ReaderStory } from "../utils";
import type { JdDsStringKey } from "../i18n";

export type HomeSection = {
  key: string;
  title: string;
  subtitle?: string;
  color: string;
  moreHref: string;
  layout?: "lead-supporting" | "feed" | "ranked" | "cards";
  stories: ReaderStory[];
};

const SECTION_COLORS = ["var(--jd-red)", "var(--jd-navy)", "var(--jd-gold)", "var(--jd-ok)"];

export function toStory(a: HomeArticle): ReaderStory {
  let img = a.imageUrl?.trim() || "";
  if (!img) {
    const res = resolveCanonicalImage({
      heroUrl: a.imageUrl,
      ogUrl: a.ogImageUrl,
      title: a.headline,
      category: a.categoryLabel || a.desk?.name || a.section,
    });
    img = res.displayUrl || "";
  }
  return {
    slug: a.slug,
    headline: a.headline,
    kicker: a.categoryLabel || a.desk?.nameHi || a.desk?.name,
    summary: a.summary,
    imageUrl: img,
    publishedAt: a.publishedAt,
    isLive: a.isLive,
  };
}

/**
 * Build homepage news sections from real feed content only.
 * Canonical Indian digital newspaper sequence:
 * मुख्य खबरें → ताज़ा खबरें → छत्तीसगढ़ → जिले की खबरें → भारत → सबसे ज्यादा पढ़ी गई → Good Pulse → Other Desks
 * Empty / thin sections are suppressed. Duplicate slugs are strictly eliminated.
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

  // 1. मुख्य खबरें (Lead + supporting image stories)
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
      subtitle: "आज के शीर्ष संपादकीय समाचार और प्रमुख घटनाक्रम",
      color: SECTION_COLORS[0],
      moreHref: "/latest",
      layout: "lead-supporting",
      stories: top,
    },
    1
  );

  // 2. ताज़ा खबरें (Latest compact image-backed feed)
  const latest = take(feed.liveWire, 4);
  pushIfEnough(
    sections,
    {
      key: "latest",
      title: t("home.latest"),
      subtitle: "पल-पल के समाचार और लाइव अपडेट्स",
      color: SECTION_COLORS[1],
      moreHref: "/latest",
      layout: "feed",
      stories: latest,
    },
    1
  );

  // 3. छत्तीसगढ़ (Regional desk: Lead + supporting stories)
  const cgStreamArticles = feed.categoryStreams?.find(
    (c) => c.id === "chhattisgarh"
  )?.articles;
  const regionalArticles = [
    ...(cgStreamArticles ?? []),
    ...(feed.regionalHighlights ?? []),
  ];
  const cg = take(regionalArticles, 4);
  pushIfEnough(
    sections,
    {
      key: "chhattisgarh",
      title: "छत्तीसगढ़",
      subtitle: "राज्य का प्रमुख क्षेत्रीय कवरेज और विकास समाचार",
      color: SECTION_COLORS[0],
      moreHref: "/category/chhattisgarh",
      layout: "lead-supporting",
      stories: cg,
    },
    1
  );

  // 4. जिले की खबरें (District-aware image cards)
  const districtPool = (feed.regionalHighlights ?? []).filter(
    (a) =>
      a.section === "raipur" ||
      a.tags?.some((tag) => /district|जिल|ज़िला/i.test(tag)) ||
      /जिला|ज़िला|दुर्ग|रायपुर|बस्तर|बिलासपुर/i.test(a.categoryLabel ?? "")
  );
  const district = take(
    districtPool.length >= 2 ? districtPool : feed.regionalHighlights,
    4
  );
  pushIfEnough(
    sections,
    {
      key: "district",
      title: t("home.district"),
      subtitle: "दुर्ग, रायपुर, बस्तर, बिलासपुर सहित सभी ज़िलों की ग्राउंड रिपोर्ट",
      color: SECTION_COLORS[2],
      moreHref: "/district?select=1",
      layout: "cards",
      stories: district,
    },
    1
  );

  // 5. भारत (National / India Desk: Lead + supporting stories)
  const indiaStreamArticles = feed.categoryStreams?.find(
    (c) => (c.id as string) === "india" || (c.id as string) === "national"
  )?.articles;

  const indiaDeskArticles = feed.editorialDesks?.find(
    (d) => d.id === "india" || d.id === "national"
  )?.articles;
  const indiaPool = [
    ...(indiaStreamArticles ?? []),
    ...(indiaDeskArticles ?? []),
    ...(feed.liveWire ?? []).filter(
      (a) => a.section === "india" || /भारत|देश|राष्ट्रीय/i.test(a.categoryLabel ?? "")
    ),
  ];
  const india = take(indiaPool, 4);
  pushIfEnough(
    sections,
    {
      key: "india",
      title: "भारत",
      subtitle: "देश की बड़ी खबरें और राष्ट्रीय परिदृश्य",
      color: SECTION_COLORS[1],
      moreHref: "/news/national",
      layout: "lead-supporting",
      stories: india,
    },
    1
  );

  // 6. सबसे ज्यादा पढ़ी गई (Trending / Most Read: Numbered ranking 1-4 with thumbnails)
  const mostRead = take(feed.trending, 4);
  pushIfEnough(
    sections,
    {
      key: "most-read",
      title: t("home.mostRead"),
      subtitle: "पाठकों के बीच सबसे अधिक चर्चित समाचार",
      color: SECTION_COLORS[0],
      moreHref: "/trending",
      layout: "ranked",
      stories: mostRead,
    },
    1
  );

  // 7. Good Pulse (Positive / useful / human-interest visual stories)
  const allRemaining = [
    ...(feed.liveWire ?? []),
    ...(feed.editorsPicks?.supporting ?? []),
    ...(feed.regionalHighlights ?? []),
  ];
  const goodPulsePool = allRemaining.filter(
    (a) =>
      /सकारात्मक|प्रेरणा|विकास|सफलता|कृषि|पर्यावरण|शिक्षा|स्वास्थ्य|good|pulse/i.test(
        a.headline + " " + (a.summary ?? "") + " " + (a.categoryLabel ?? "")
      )
  );
  const goodPulse = take(
    goodPulsePool.length >= 2 ? goodPulsePool : allRemaining,
    3
  );
  pushIfEnough(
    sections,
    {
      key: "good-pulse",
      title: "Good Pulse",
      subtitle: "सकारात्मक, जनहितकारी और प्रेरणादायक कहानियां",
      color: SECTION_COLORS[3],
      moreHref: "/latest",
      layout: "cards",
      stories: goodPulse,
    },
    2
  );

  // 8. Category streams (taxonomy-backed: Sports, Tech, Business, Entertainment, etc.)
  for (const stream of feed.categoryStreams ?? []) {
    if (sections.length >= maxSections) break;
    // Skip if already represented above
    if (stream.id === "chhattisgarh" || stream.id === "india") continue;
    const stories = take(stream.articles, 4);
    pushIfEnough(sections, {
      key: `cat-${stream.id}`,
      title: stream.labelHi || stream.label,
      color: SECTION_COLORS[sections.length % SECTION_COLORS.length],
      moreHref: `/category/${stream.id}`,
      layout: "cards",
      stories,
    });
  }

  // 9. Editorial desks when present
  for (const desk of feed.editorialDesks ?? []) {
    if (desk.collapsed || sections.length >= maxSections) continue;
    if (desk.id === "chhattisgarh" || desk.id === "india" || desk.id === "national") continue;
    const stories = take(desk.articles, 4);
    pushIfEnough(sections, {
      key: `desk-${desk.id}`,
      title: desk.labelHi || desk.label,
      color: SECTION_COLORS[sections.length % SECTION_COLORS.length],
      moreHref: "/latest",
      layout: "cards",
      stories,
    });
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
