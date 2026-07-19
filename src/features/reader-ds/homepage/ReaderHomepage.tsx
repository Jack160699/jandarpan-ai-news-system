import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { readerDsFontClassName } from "../fonts";
import type { ReaderStory } from "../utils";
import {
  Ad,
  AudioBriefingCta,
  BottomNav,
  BreakingStrip,
  LeadStory,
  Masthead,
  SectionHeader,
  SecondaryStory,
  UtilityRow,
} from "../components";

function toStory(a: HomeArticle): ReaderStory {
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

const SECTION_COLORS = ["var(--jd-red)", "var(--jd-navy)", "var(--jd-gold)", "var(--jd-ok)"];

type HomeSection = {
  key: string;
  title: string;
  color: string;
  moreHref: string;
  stories: ReaderStory[];
};

/** Build homepage sections from all available real feed pools (graceful fallback). */
function buildSections(feed: GeneratedHomepageFeed, excludeSlugs: Set<string>): HomeSection[] {
  const seen = new Set(excludeSlugs);
  const take = (pool: HomeArticle[] | undefined, n: number): ReaderStory[] => {
    const out: ReaderStory[] = [];
    for (const a of pool ?? []) {
      if (!a?.slug || seen.has(a.slug)) continue;
      seen.add(a.slug);
      out.push(toStory(a));
      if (out.length >= n) break;
    }
    return out;
  };

  const sections: HomeSection[] = [];

  const regional = take(feed.regionalHighlights, 4);
  if (regional.length) {
    sections.push({ key: "regional", title: "आपके जिले से", color: SECTION_COLORS[0], moreHref: "/district", stories: regional });
  }

  const trending = take(feed.trending, 4);
  if (trending.length) {
    sections.push({ key: "trending", title: "शीर्ष ख़बरें", color: SECTION_COLORS[1], moreHref: "/trending", stories: trending });
  }

  for (const stream of feed.categoryStreams ?? []) {
    const stories = take(stream.articles, 4);
    if (stories.length) {
      sections.push({
        key: `cat-${stream.id}`,
        title: stream.labelHi || stream.label,
        color: SECTION_COLORS[sections.length % SECTION_COLORS.length],
        moreHref: `/category/${stream.id}`,
        stories,
      });
    }
  }

  const live = take(feed.liveWire, 4);
  if (live.length) {
    sections.push({ key: "live", title: "ताज़ा अपडेट", color: SECTION_COLORS[2], moreHref: "/latest", stories: live });
  }

  return sections;
}

/**
 * Approved navy/red/gold reader homepage. Server Component — assembles the
 * live `GeneratedHomepageFeed` into the reusable Reader-DS components.
 * Renders only when NEXT_PUBLIC_READER_DS=1 (wired in `src/app/page.tsx`).
 */
export function ReaderHomepage({ feed }: { feed: GeneratedHomepageFeed }) {
  const lead = feed.editorsPicks?.lead ? toStory(feed.editorsPicks.lead) : null;
  const secondary = (feed.editorsPicks?.supporting ?? []).slice(0, 2).map(toStory);
  const breaking =
    feed.breakingTicker?.[0]?.headline ??
    feed.localBreakingAlerts?.[0]?.headline ??
    null;

  const excludeSlugs = new Set<string>(
    [feed.editorsPicks?.lead, ...(feed.editorsPicks?.supporting ?? [])]
      .filter(Boolean)
      .map((a) => (a as HomeArticle).slug)
  );
  const sections = buildSections(feed, excludeSlugs).slice(0, 6);

  return (
    <div className={`jd-ds ${readerDsFontClassName}`}>
      <Masthead />
      <UtilityRow />
      <BreakingStrip headline={breaking} />

      <main id="main-content" role="main" style={{ paddingBottom: 84, background: "var(--jd-paper)" }}>
        {lead ? <LeadStory story={lead} /> : null}

        {secondary.length ? (
          <div style={{ padding: "6px 14px 0" }}>
            {secondary.map((s, i) => (
              <SecondaryStory key={s.slug} story={s} last={i === secondary.length - 1} />
            ))}
          </div>
        ) : null}

        <AudioBriefingCta />

        <Ad label="विज्ञापन · टॉप 320×64" />

        {sections.map((section, i) => (
          <section key={section.key}>
            <SectionHeader title={section.title} color={section.color} moreHref={section.moreHref} />
            <div style={{ padding: "0 14px" }}>
              {section.stories.map((s, idx) => (
                <SecondaryStory key={s.slug} story={s} last={idx === section.stories.length - 1} />
              ))}
            </div>
            {i === 1 ? <Ad label="विज्ञापन · मिड-फ़ीड" close /> : null}
          </section>
        ))}
      </main>

      <BottomNav active="home" />
    </div>
  );
}
