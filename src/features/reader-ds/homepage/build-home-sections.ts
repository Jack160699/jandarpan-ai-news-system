import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { resolveCanonicalImage } from "@/lib/news/images/canonical-image-resolver";
import { getDistrict } from "@/lib/regional/districts";
import { articleMatchesDistrict } from "@/lib/district-intelligence/match";
import { DEFAULT_DISTRICT_SLUG } from "@/lib/district-intelligence";
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
 * 1. मेरा जिला (Strictly accurate local/personalized district news)
 * 2. छत्तीसगढ़ (Statewide regional coverage)
 * 3. भारत (National news)
 * 4. विश्व (International news)
 * 5. खेल (Sports)
 * 6. मनोरंजन (Entertainment)
 * 7. व्यापार (Business)
 * 8. टेक्नोलॉजी (Technology)
 * 9. जीवनशैली (Lifestyle)
 * 10. Good Pulse (Inspirational human-interest stories)
 * 11. सबसे ज्यादा पढ़ी गई (Trending / Ranked 1-4 with images)
 * Empty / thin sections are suppressed. Duplicate slugs are strictly eliminated.
 */
export function buildHomeSections(
  feed: GeneratedHomepageFeed,
  excludeSlugs: Set<string>,
  t: (key: JdDsStringKey) => string,
  opts?: { maxSections?: number; minStories?: number; homeDistrict?: string }
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

  const homeDistrict = opts?.homeDistrict ?? DEFAULT_DISTRICT_SLUG;
  const districtObj = getDistrict(homeDistrict);
  const districtSlug = districtObj?.slug ?? homeDistrict;
  const districtNameHi = districtObj?.nameHi ?? "दुर्ग";

  // 1. मेरा जिला (Personalized / Local district stories)
  const allRegional = [
    ...(feed.regionalHighlights ?? []),
    ...(feed.liveWire ?? []),
    ...(feed.trending ?? []),
  ];
  const exactDistrictArticles = allRegional.filter((a) =>
    articleMatchesDistrict(a, districtSlug)
  );

  if (exactDistrictArticles.length >= 1) {
    const stories = take(exactDistrictArticles, 4);
    pushIfEnough(
      sections,
      {
        key: "district",
        title: `मेरा जिला — ${districtNameHi}`,
        subtitle: `${districtNameHi} के स्थानीय समाचार और ग्राउंड रिपोर्ट`,
        color: SECTION_COLORS[0],
        moreHref: `/district/${districtSlug}`,
        layout: stories.length >= 2 ? "lead-supporting" : "cards",
        stories,
      },
      1
    );
  } else {
    // If no exact stories for home district, show general district section without falsely claiming it's homeDistrict
    const genericDistrictPool = (feed.regionalHighlights ?? []).filter(
      (a) =>
        a.tags?.some((tag) => /district|जिल|ज़िला/i.test(tag)) ||
        /जिला|ज़िला|दुर्ग|रायपुर|बस्तर|बिलासपुर/i.test(a.categoryLabel ?? "")
    );
    const stories = take(
      genericDistrictPool.length >= 1 ? genericDistrictPool : feed.regionalHighlights,
      4
    );
    pushIfEnough(
      sections,
      {
        key: "district",
        title: "जिले की खबरें",
        subtitle: "दुर्ग, रायपुर, बस्तर, बिलासपुर सहित सभी ज़िलों की ग्राउंड रिपोर्ट",
        color: SECTION_COLORS[0],
        moreHref: "/district?select=1",
        layout: "cards",
        stories,
      },
      1
    );
  }

  // 2. छत्तीसगढ़ (Statewide regional desk)
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
      color: SECTION_COLORS[1],
      moreHref: "/category/chhattisgarh",
      layout: "lead-supporting",
      stories: cg,
    },
    1
  );

  // 3. भारत (National / India Desk)
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
      color: SECTION_COLORS[0],
      moreHref: "/news/national",
      layout: "lead-supporting",
      stories: india,
    },
    1
  );

  // 4. विश्व (World / International)
  const worldStream = feed.categoryStreams?.find(
    (c) => String(c.id) === "world" || String(c.id) === "international"
  )?.articles;
  const worldDesk = feed.editorialDesks?.find(
    (d) => String(d.id) === "world" || String(d.id) === "international"
  )?.articles;
  const worldPool = [
    ...(worldStream ?? []),
    ...(worldDesk ?? []),
    ...(feed.liveWire ?? []).filter(
      (a) =>
        String(a.section) === "world" ||
        String(a.section) === "international" ||
        /विश्व|दुनिया|अंतरराष्ट्रीय|विदेश|international|world/i.test(
          (a.categoryLabel ?? "") + " " + a.headline
        )
    ),
  ];
  const world = take(worldPool, 4);
  pushIfEnough(
    sections,
    {
      key: "world",
      title: "विश्व",
      subtitle: "अंतरराष्ट्रीय घटनाक्रम और वैश्विक परिप्रेक्ष्य",
      color: SECTION_COLORS[2],
      moreHref: "/news/international",
      layout: "lead-supporting",
      stories: world,
    },
    1
  );

  // 5. खेल (Sports)
  const sportsStream = feed.categoryStreams?.find((c) => String(c.id) === "sports")?.articles;
  const sportsDesk = feed.editorialDesks?.find((d) => String(d.id) === "sports")?.articles;
  const sportsPool = [
    ...(sportsStream ?? []),
    ...(sportsDesk ?? []),
    ...(feed.liveWire ?? []).filter(
      (a) =>
        String(a.section) === "sports" ||
        /खेल|क्रिकेट|football|cricket|olympic|match/i.test(
          (a.categoryLabel ?? "") + " " + a.headline
        )
    ),
  ];
  const sports = take(sportsPool, 4);
  pushIfEnough(
    sections,
    {
      key: "sports",
      title: "खेल",
      subtitle: "क्रिकेट, फुटबॉल और खेल जगत की प्रमुख खबरें",
      color: SECTION_COLORS[3],
      moreHref: "/category/sports",
      layout: "lead-supporting",
      stories: sports,
    },
    1
  );

  // 6. मनोरंजन (Entertainment)
  const entStream = feed.categoryStreams?.find(
    (c) => String(c.id) === "entertainment" || String(c.id) === "cinema"
  )?.articles;
  const entDesk = feed.editorialDesks?.find(
    (d) => String(d.id) === "entertainment" || String(d.id) === "cinema"
  )?.articles;
  const entPool = [
    ...(entStream ?? []),
    ...(entDesk ?? []),
    ...(feed.liveWire ?? []).filter(
      (a) =>
        String(a.section) === "entertainment" ||
        /मनोरंजन|सिनेमा|बॉलीवुड|फिल्म|कलाकार|entertainment|cinema/i.test(
          (a.categoryLabel ?? "") + " " + a.headline
        )
    ),
  ];
  const ent = take(entPool, 4);
  pushIfEnough(
    sections,
    {
      key: "entertainment",
      title: "मनोरंजन",
      subtitle: "सिनेमा, कला और मनोरंजन जगत की हलचल",
      color: SECTION_COLORS[0],
      moreHref: "/category/entertainment",
      layout: "cards",
      stories: ent,
    },
    1
  );

  // 7. व्यापार (Business)
  const bizStream = feed.categoryStreams?.find((c) => String(c.id) === "business")?.articles;
  const bizDesk = feed.editorialDesks?.find((d) => String(d.id) === "business")?.articles;
  const bizPool = [
    ...(bizStream ?? []),
    ...(bizDesk ?? []),
    ...(feed.liveWire ?? []).filter(
      (a) =>
        String(a.section) === "business" ||
        /व्यापार|बाजार|शेयर|अर्थव्यवस्था|business|economy|market/i.test(
          (a.categoryLabel ?? "") + " " + a.headline
        )
    ),
  ];
  const biz = take(bizPool, 4);
  pushIfEnough(
    sections,
    {
      key: "business",
      title: "व्यापार",
      subtitle: "बाजार, अर्थव्यवस्था और कारोबारी समाचार",
      color: SECTION_COLORS[1],
      moreHref: "/category/business",
      layout: "cards",
      stories: biz,
    },
    1
  );

  // 8. टेक्नोलॉजी (Technology)
  const techStream = feed.categoryStreams?.find((c) => String(c.id) === "technology")?.articles;
  const techDesk = feed.editorialDesks?.find((d) => String(d.id) === "technology")?.articles;
  const techPool = [
    ...(techStream ?? []),
    ...(techDesk ?? []),
    ...(feed.liveWire ?? []).filter(
      (a) =>
        String(a.section) === "technology" ||
        /तकनीक|टेक्नोलॉजी|मोबाइल|इंटरनेट|technology|gadgets|ai/i.test(
          (a.categoryLabel ?? "") + " " + a.headline
        )
    ),
  ];
  const tech = take(techPool, 4);
  pushIfEnough(
    sections,
    {
      key: "technology",
      title: "टेक्नोलॉजी",
      subtitle: "गैजेट्स, नवाचार और डिजिटल दुनिया",
      color: SECTION_COLORS[2],
      moreHref: "/category/technology",
      layout: "cards",
      stories: tech,
    },
    1
  );

  // 9. जीवनशैली (Lifestyle)
  const lifeStream = feed.categoryStreams?.find(
    (c) => String(c.id) === "lifestyle" || String(c.id) === "health"
  )?.articles;
  const lifeDesk = feed.editorialDesks?.find(
    (d) => String(d.id) === "lifestyle" || String(d.id) === "health"
  )?.articles;
  const lifePool = [
    ...(lifeStream ?? []),
    ...(lifeDesk ?? []),
    ...(feed.liveWire ?? []).filter(
      (a) =>
        /जीवनशैली|स्वास्थ्य|खानपान|सेहत|lifestyle|health/i.test(
          (a.categoryLabel ?? "") + " " + a.headline
        )
    ),
  ];
  const life = take(lifePool, 4);
  pushIfEnough(
    sections,
    {
      key: "lifestyle",
      title: "जीवनशैली",
      subtitle: "स्वास्थ्य, सेहत और जीवन शैली",
      color: SECTION_COLORS[3],
      moreHref: "/category/lifestyle",
      layout: "cards",
      stories: life,
    },
    1
  );

  // 10. Good Pulse (Positive / useful / human-interest visual stories)
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
      color: SECTION_COLORS[2],
      moreHref: "/latest",
      layout: "cards",
      stories: goodPulse,
    },
    2
  );

  // 11. सबसे ज्यादा पढ़ी गई (Trending / Most Read: Numbered ranking 1-4 with thumbnails)
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

  // 12. Remaining Category streams (taxonomy-backed)
  const handledStreamIds = new Set([
    "chhattisgarh", "india", "national", "world", "international",
    "sports", "entertainment", "cinema", "business", "technology",
    "lifestyle", "health"
  ]);

  for (const stream of feed.categoryStreams ?? []) {
    if (sections.length >= maxSections) break;
    if (handledStreamIds.has(String(stream.id))) continue;
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

  // 13. Remaining Editorial desks when present
  for (const desk of feed.editorialDesks ?? []) {
    if (desk.collapsed || sections.length >= maxSections) continue;
    if (handledStreamIds.has(String(desk.id))) continue;
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
