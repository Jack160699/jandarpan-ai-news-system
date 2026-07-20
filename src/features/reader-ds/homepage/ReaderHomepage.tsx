"use client";

import Link from "next/link";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import type { NativeAdCreative } from "@/lib/monetization/native-feed-ads";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
import type { ReaderStory } from "../utils";
import {
  BreakingStrip,
  DesktopPrimaryNav,
  LeadStory,
  Masthead,
  ReaderShell,
  SectionHeader,
  SecondaryStory,
  UtilityRow,
} from "../components";
import { UtilTiles } from "../components/UtilTiles";
import { ReservedAd } from "../components/ReservedAd";
import { DismissibleAd } from "../components/DismissibleAd";
import {
  NativeSponsoredCard,
  PremiumExclusiveStrip,
} from "../monetization";
import { useJdDsT, type JdDsStringKey } from "../i18n";

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

function buildSections(
  feed: GeneratedHomepageFeed,
  excludeSlugs: Set<string>,
  t: (key: JdDsStringKey) => string
): HomeSection[] {
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
      title: t("home.district"),
      color: SECTION_COLORS[0],
      moreHref: "/district",
      stories: regional,
    });
  }

  const trending = take(feed.trending, 4);
  if (trending.length) {
    sections.push({
      key: "trending",
      title: t("home.topStories"),
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
      title: t("home.topStories"),
      color: SECTION_COLORS[0],
      moreHref: "/latest",
      stories: live,
    });
  }

  return sections;
}

type ReaderHomepageProps = {
  feed: GeneratedHomepageFeed;
  nativeAd?: NativeAdCreative | null;
  adsEnabled?: boolean;
};

/**
 * A1 homepage + SoT desktop/tablet editorial composition.
 * Phone layout stays the approved single column — never stretched.
 */
export function ReaderHomepage({
  feed,
  nativeAd = null,
  adsEnabled = true,
}: ReaderHomepageProps) {
  const { isPremium } = useReaderAccount();
  const { t, locale } = useJdDsT();
  const showAds = adsEnabled && !isPremium;

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

  const latestSidebar = secondaryPool.slice(2, 7).map((a) => {
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

  const sections = buildSections(feed, used, t).slice(0, 6);
  const seeAll = t("common.seeAll");

  return (
    <ReaderShell activeNav="home" bottomPad={showAds ? 128 : 72}>
      <Masthead premiumBadge={isPremium} />
      <DesktopPrimaryNav active="home" />
      <UtilityRow />
      <BreakingStrip headline={breaking} href={breakingHref} />

      <main
        id="main-content"
        role="main"
        className="jd-shell"
        style={{
          flex: 1,
          background: "var(--jd-paper)",
        }}
      >
        <div className="jd-home-hero">
          <div className="jd-home-lead">
            {lead ? <LeadStory story={lead} /> : null}
            {secondary.length ? (
              <div className="jd-home-rail" aria-label={t("home.secondaryAria")}>
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
            {showAds ? (
              <div className="jd-home-ad-leader">
                <ReservedAd format="leaderboard" locale={locale} />
              </div>
            ) : null}
          </div>

          <aside className="jd-home-desk-rail" aria-label={t("home.latest")}>
            {/* Market tiles omitted until honest live rates exist */}
            <UtilTiles />
            <div className="jd-home-side-module">
              <div
                className="jd-ui"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--jd-muted)",
                  marginBottom: 8,
                }}
              >
                {t("home.latest")}
              </div>
              {(latestSidebar.length ? latestSidebar : secondary).map((s, i, arr) => (
                <SecondaryStory
                  key={`side-${s.slug}`}
                  story={s}
                  last={i === arr.length - 1}
                  toneIndex={i}
                />
              ))}
            </div>
            {showAds ? <ReservedAd format="sidebar" locale={locale} /> : null}
          </aside>
        </div>

        {/* Phone-only util tiles placement (desk rail hides this duplicate via structure) */}
        <div className="jd-home-phone-utils">
          <UtilTiles />
        </div>

        {isPremium ? (
          <PremiumExclusiveStrip
            href="/membership/manage"
            title="एक्सक्लूसिव: सदस्य डेस्क से चयनित विश्लेषण"
          />
        ) : showAds ? (
          <DismissibleAd label="विज्ञापन · टॉप 320×64" height={64} />
        ) : null}

        {showAds && nativeAd ? (
          <NativeSponsoredCard
            sponsorName={nativeAd.sponsorName}
            headline={nativeAd.headline}
            ctaLabel={
              /learn more|explore|see partnership|watch now|view offer/i.test(nativeAd.ctaLabel)
                ? "और जानें"
                : nativeAd.ctaLabel
            }
            href={nativeAd.targetUrl}
            imageUrl={nativeAd.imageUrl ?? nativeAd.videoPosterUrl}
          />
        ) : null}

        <div className="jd-home-sections">
          {sections.map((section, i) => (
            <section key={section.key}>
              <SectionHeader
                title={section.title}
                color={section.color}
                moreHref={section.moreHref}
                moreLabel={seeAll}
              />
              <div className="jd-home-section-cards">
                {section.stories.map((s, idx) => (
                  <SecondaryStory
                    key={s.slug}
                    story={s}
                    last={idx === section.stories.length - 1}
                    toneIndex={idx}
                  />
                ))}
              </div>
              {i === 0 && showAds ? (
                <>
                  <DismissibleAd label="विज्ञापन · मिड-फ़ीड 300×250" height={96} />
                  <ReservedAd format="infeed" locale={locale} className="jd-home-desk-only-ad" />
                </>
              ) : null}
            </section>
          ))}
        </div>

        <div className="jd-home-promo-row">
          <div className="jd-home-promo">
            <h3 className="jd-serif">{t("home.supportJournalism")}</h3>
            <p className="jd-ui">{t("home.supportJournalismSub")}</p>
            <Link href="/membership">{t("desk.becomeMember")} →</Link>
          </div>
          <div className="jd-home-promo jd-home-promo--wa">
            <h3 className="jd-serif">{t("home.joinWhatsapp")}</h3>
            <p className="jd-ui">{t("home.joinWhatsappSub")}</p>
            <Link href="/notifications">{t("common.seeAll")} →</Link>
          </div>
        </div>
      </main>

      {showAds ? <DismissibleAd sticky label="स्टिकी बैनर · 320×50" /> : null}
    </ReaderShell>
  );
}
