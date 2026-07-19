import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import { readerDsFontClassName } from "../fonts";
import type { ReaderStory } from "../utils";
import {
  Ad,
  BottomNav,
  BreakingStrip,
  LeadStory,
  Masthead,
  SectionHeader,
  SecondaryStory,
  UtilityRow,
} from "../components";
import { UtilTiles } from "../components/UtilTiles";

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

/** Prefer articles that carry a real image URL for lead visual fidelity. */
function pickLead(feed: GeneratedHomepageFeed): HomeArticle | null {
  const candidates = [
    feed.editorsPicks?.lead,
    ...(feed.editorsPicks?.supporting ?? []),
    ...(feed.trending ?? []),
    ...(feed.regionalHighlights ?? []),
    ...(feed.liveWire ?? []),
  ].filter(Boolean) as HomeArticle[];

  const withImage = candidates.find((a) => a.imageUrl && a.imageUrl.trim());
  return withImage ?? candidates[0] ?? null;
}

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
    sections.push({
      key: "regional",
      title: "आपके जिले से",
      color: SECTION_COLORS[0],
      moreHref: "/district",
      stories: regional,
    });
  }

  const trending = take(feed.trending, 4);
  if (trending.length) {
    sections.push({
      key: "trending",
      title: "शीर्ष ख़बरें",
      color: SECTION_COLORS[0],
      moreHref: "/trending",
      stories: trending,
    });
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
  if (live.length && !sections.some((s) => s.key === "trending")) {
    sections.push({
      key: "top",
      title: "शीर्ष ख़बरें",
      color: SECTION_COLORS[0],
      moreHref: "/latest",
      stories: live,
    });
  }

  return sections;
}

/**
 * Approved A1 homepage composition (flag-gated):
 * masthead → utility → breaking → lead → 2 secondary → util tiles → ad → sections → bottom nav.
 */
export function ReaderHomepage({ feed }: { feed: GeneratedHomepageFeed }) {
  const leadArticle = pickLead(feed);
  const lead = leadArticle ? toStory(leadArticle) : null;

  const used = new Set<string>(leadArticle?.slug ? [leadArticle.slug] : []);
  const secondaryPool = [
    ...(feed.editorsPicks?.supporting ?? []),
    ...(feed.trending ?? []),
    ...(feed.regionalHighlights ?? []),
    ...(feed.liveWire ?? []),
  ].filter((a) => a && !used.has(a.slug));

  const secondary = secondaryPool.slice(0, 2).map((a) => {
    used.add(a.slug);
    return toStory(a);
  });

  const breaking =
    feed.breakingTicker?.[0]?.headline ??
    feed.localBreakingAlerts?.[0]?.headline ??
    null;
  const breakingHref = feed.breakingTicker?.[0]?.slug
    ? `/story/${feed.breakingTicker[0].slug}`
    : feed.localBreakingAlerts?.[0]?.slug
      ? `/story/${feed.localBreakingAlerts[0].slug}`
      : "#";

  const sections = buildSections(feed, used).slice(0, 6);

  return (
    <div
      className={`jd-ds ${readerDsFontClassName}`}
      style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--jd-paper)" }}
    >
      <Masthead />
      <UtilityRow />
      <BreakingStrip headline={breaking} href={breakingHref} />

      <main
        id="main-content"
        role="main"
        style={{ flex: 1, paddingBottom: 72, background: "var(--jd-paper)" }}
      >
        {lead ? <LeadStory story={lead} /> : null}

        {secondary.length ? (
          <div style={{ padding: "6px 14px 0" }}>
            {secondary.map((s, i) => (
              <SecondaryStory
                key={s.slug}
                story={s}
                last={i === secondary.length - 1}
                toneIndex={i + 1}
              />
            ))}
          </div>
        ) : null}

        <UtilTiles />

        <Ad label="विज्ञापन · टॉप 320×64" />

        {sections.map((section, i) => (
          <section key={section.key}>
            <SectionHeader title={section.title} color={section.color} moreHref={section.moreHref} />
            <div style={{ padding: "0 14px" }}>
              {section.stories.map((s, idx) => (
                <SecondaryStory
                  key={s.slug}
                  story={s}
                  last={idx === section.stories.length - 1}
                  toneIndex={idx}
                />
              ))}
            </div>
            {i === 0 ? <Ad label="विज्ञापन · मिड-फ़ीड" close height={64} /> : null}
          </section>
        ))}
      </main>

      <BottomNav active="home" />
    </div>
  );
}
