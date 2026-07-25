"use client";

import Link from "next/link";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import type { NativeAdCreative } from "@/lib/monetization/native-feed-ads";
import { useReaderAccount } from "@/providers/ReaderAccountProvider";
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
import { MandiRatesPanel } from "../utilities/MandiRatesPanel";
import { VerifiedRatesLinks } from "../utilities/VerifiedRatesLinks";
import { ReservedAd } from "../components/ReservedAd";
import { DismissibleAd } from "../components/DismissibleAd";
import {
  NativeSponsoredCard,
  PremiumExclusiveStrip,
} from "../monetization";
import { useJdDsT } from "../i18n";
import { useReaderPreferencesOptional } from "@/providers/ReaderPreferencesProvider";
import {
  DEFAULT_DISTRICT_SLUG,
  rankDistrictStories,
} from "@/lib/district-intelligence";
import { isAliveHomeEnabled } from "@/lib/engagement/config";
import { toFormattedStory } from "@/lib/engagement/story-format";
import { isAdPreviewMode, shouldMountStickyAd } from "../ads/ad-display";
import { AliveHomeBriefingSlot, AliveHomeSecondarySlot } from "../engagement/AliveHomeModules";
import { FormatStoryCard } from "../engagement/FormatStoryCard";
import { pickBreakingItems } from "./breaking";
import { buildHomeSections, toStory } from "./build-home-sections";
import { PageEndingModules } from "./PageEndingModules";

function pickLead(
  feed: GeneratedHomepageFeed,
  homeDistrict: string
): HomeArticle | null {
  const candidates = [
    feed.editorsPicks?.lead,
    ...(feed.editorsPicks?.supporting ?? []),
    ...(feed.trending ?? []),
    ...(feed.regionalHighlights ?? []),
    ...(feed.liveWire ?? []),
    ...(feed.breakingTicker ?? []),
  ].filter(Boolean) as HomeArticle[];

  const ranked = rankDistrictStories(candidates, homeDistrict, { limit: 1 });
  if (ranked.lead) return ranked.lead.article;

  const withImage = candidates.find((a) => a.imageUrl && a.imageUrl.trim());
  return withImage ?? candidates[0] ?? null;
}

type ReaderHomepageProps = {
  feed: GeneratedHomepageFeed;
  nativeAd?: NativeAdCreative | null;
  adsEnabled?: boolean;
  /** Server-gated: only true when accepted verified rate snapshots exist. */
  verifiedRatesNavEnabled?: boolean;
};

/**
 * A1 homepage + SoT desktop/tablet editorial composition.
 * Journalism first; mandi/utilities sit in a lower utility block.
 * Phase 1 Alive Home modules insert after breaking when enabled.
 */
export function ReaderHomepage({
  feed,
  nativeAd = null,
  adsEnabled = true,
  verifiedRatesNavEnabled = false,
}: ReaderHomepageProps) {
  const { isPremium } = useReaderAccount();
  const { t, locale } = useJdDsT();
  const prefsCtx = useReaderPreferencesOptional();
  const homeDistrict =
    prefsCtx?.prefs.homeDistrict ?? DEFAULT_DISTRICT_SLUG;
  const showAds = adsEnabled && !isPremium;
  const aliveHome = isAliveHomeEnabled();

  const leadArticle = pickLead(feed, homeDistrict);
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

  const breakingItems = pickBreakingItems(feed);
  const sections = buildHomeSections(feed, used, t);
  for (const section of sections) {
    for (const s of section.stories) used.add(s.slug);
  }

  const latestSidebar = secondaryPool
    .filter((a) => !used.has(a.slug))
    .slice(0, 5)
    .map((a) => {
      used.add(a.slug);
      return toStory(a);
    });

  const mostReadSidebar = (feed.trending ?? [])
    .filter((a) => a && !used.has(a.slug))
    .slice(0, 4)
    .map((a) => {
      used.add(a.slug);
      return toStory(a);
    });

  const seeAll = t("common.seeAll");
  const adPreview = isAdPreviewMode();
  const showStickyAd =
    showAds &&
    shouldMountStickyAd({
      hasCreative: false,
      forcePreview: adPreview,
    });

  const endingLatest = (feed.liveWire ?? [])
    .filter((a) => a?.slug && a.headline?.trim())
    .map(toStory);
  const endingMostRead = (feed.trending ?? [])
    .filter((a) => a?.slug && a.headline?.trim())
    .map(toStory);
  const endingCategories = [
    { href: "/category/chhattisgarh", label: locale === "en" ? "Chhattisgarh" : "छत्तीसगढ़" },
    { href: "/news/national", label: locale === "en" ? "India" : "भारत" },
    { href: "/category/politics", label: locale === "en" ? "Politics" : "राजनीति" },
    { href: "/category/business", label: locale === "en" ? "Business" : "व्यापार" },
    { href: "/category/education", label: locale === "en" ? "Education" : "शिक्षा" },
    { href: "/category/health", label: locale === "en" ? "Health" : "स्वास्थ्य" },
    { href: "/category/sports", label: locale === "en" ? "Sports" : "खेल" },
    { href: "/category/entertainment", label: locale === "en" ? "Entertainment" : "मनोरंजन" },
    { href: "/category/technology", label: locale === "en" ? "Technology" : "टेक्नोलॉजी" },
  ];

  const articleBySlug = new Map<string, HomeArticle>();
  for (const pool of [
    feed.trending,
    feed.liveWire,
    feed.regionalHighlights,
    feed.editorsPicks?.supporting,
    feed.breakingTicker,
  ]) {
    for (const a of pool ?? []) {
      if (a?.slug) articleBySlug.set(a.slug, a);
    }
  }
  if (feed.editorsPicks?.lead?.slug) {
    articleBySlug.set(feed.editorsPicks.lead.slug, feed.editorsPicks.lead);
  }

  return (
    <ReaderShell activeNav="home" bottomPad={showStickyAd ? 128 : 72}>
      <Masthead premiumBadge={isPremium} />
      <DesktopPrimaryNav active="home" />
      <UtilityRow />
      <BreakingStrip items={breakingItems} />

      <main
        id="main-content"
        role="main"
        className="jd-shell"
        style={{
          flex: 1,
          background: "var(--jd-paper)",
        }}
      >
        {aliveHome ? (
          <AliveHomeBriefingSlot
            feed={feed}
            excludeSlugs={
              new Set(leadArticle?.slug ? [leadArticle.slug] : [])
            }
          />
        ) : null}

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
                <ReservedAd format="leaderboard" locale={locale} placementId="home.leaderboard" />
                <ReservedAd
                  format="tablet"
                  locale={locale}
                  placementId="tablet.adaptive"
                  className="jd-home-ad-tablet"
                />
              </div>
            ) : null}
          </div>

          <aside className="jd-home-desk-rail" aria-label={t("home.latest")} data-jd-rail="editorial">
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
            {mostReadSidebar.length ? (
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
                  {t("home.mostRead")}
                </div>
                {mostReadSidebar.map((s, i, arr) => (
                  <SecondaryStory
                    key={`most-${s.slug}`}
                    story={s}
                    last={i === arr.length - 1}
                    toneIndex={i}
                  />
                ))}
              </div>
            ) : null}
            {showAds ? (
              <ReservedAd format="sidebar" locale={locale} placementId="home.sidebar" />
            ) : null}
          </aside>
        </div>

        {aliveHome ? (
          <AliveHomeSecondarySlot
            feed={feed}
            excludeSlugs={
              new Set(
                [
                  leadArticle?.slug,
                  ...secondary.map((s) => s.slug),
                ].filter((s): s is string => Boolean(s))
              )
            }
          />
        ) : null}

        {showAds ? (
          <div className="jd-home-billboard">
            <ReservedAd format="billboard" locale={locale} placementId="home.billboard" />
          </div>
        ) : null}

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
            <section key={section.key} data-jd-home-section={section.key}>
              <SectionHeader
                title={section.title}
                color={section.color}
                moreHref={section.moreHref}
                moreLabel={seeAll}
              />
              <div className="jd-home-section-cards">
                {section.stories.map((s, idx) => {
                  const source = articleBySlug.get(s.slug);
                  if (aliveHome && source) {
                    return (
                      <FormatStoryCard
                        key={s.slug}
                        story={toFormattedStory(source, locale)}
                        last={idx === section.stories.length - 1}
                        toneIndex={idx}
                      />
                    );
                  }
                  return (
                    <SecondaryStory
                      key={s.slug}
                      story={s}
                      last={idx === section.stories.length - 1}
                      toneIndex={idx}
                    />
                  );
                })}
              </div>
              {i === 0 && showAds ? (
                <>
                  <DismissibleAd label="विज्ञापन · मिड-फ़ीड 300×250" height={96} />
                  <ReservedAd
                    format="infeed"
                    locale={locale}
                    placementId="home.infeed"
                    className="jd-home-desk-only-ad"
                  />
                </>
              ) : null}
              {i === 1 && showAds ? (
                <div className="jd-home-sponsor">
                  <ReservedAd format="sponsor" locale={locale} placementId="home.sponsor" />
                </div>
              ) : null}
            </section>
          ))}
        </div>

        <section
          className="jd-home-utility"
          data-testid="jd-home-utility"
          aria-label={t("home.utilityTitle")}
        >
          <h2 className="jd-ui jd-home-utility__title">{t("home.utilityTitle")}</h2>
          <MandiRatesPanel />
          <VerifiedRatesLinks enabled={verifiedRatesNavEnabled} />
          <UtilTiles />
          <p className="jd-ui" style={{ margin: "4px 14px 0", fontSize: 12 }}>
            <Link href="/rates">{t("home.utilityRatesLink")} →</Link>
          </p>
        </section>

        <div className="jd-home-promo-row">
          <div className="jd-home-promo">
            <h3 className="jd-serif">{t("home.supportJournalism")}</h3>
            <p className="jd-ui">{t("home.supportJournalismSub")}</p>
            <Link href="/membership">{t("desk.becomeMember")} →</Link>
          </div>
        </div>

        <div data-testid="jd-home-ending">
          <PageEndingModules
            latest={endingLatest}
            mostRead={endingMostRead}
            categories={endingCategories}
            excludeSlugs={
              new Set(
                [leadArticle?.slug, ...secondary.map((s) => s.slug)].filter(
                  (s): s is string => Boolean(s)
                )
              )
            }
          />
        </div>

        {showAds ? (
          <div className="jd-home-footer-ad">
            <ReservedAd format="leaderboard" locale={locale} placementId="home.leaderboard" />
          </div>
        ) : null}
      </main>

      {showStickyAd ? (
        <DismissibleAd sticky label="स्टिकी बैनर · 320×50" forcePreview={adPreview} />
      ) : null}
    </ReaderShell>
  );
}
