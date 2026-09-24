"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { buildDailyDarpan } from "@/lib/engagement/daily-darpan";
import { buildLocalPulse } from "@/lib/engagement/local-pulse";
import { pickDevelopingStory } from "@/lib/engagement/pick-developing";
import { toFormattedStory } from "@/lib/engagement/story-format";
import { useReaderPreferencesOptional } from "@/providers/ReaderPreferencesProvider";
import { DEFAULT_DISTRICT_SLUG } from "@/lib/district-intelligence";
import { useJdDsT } from "../i18n";
import { SectionHeader } from "../components";
import { DevelopingStoryTeaserCard } from "./DevelopingStoryTeaserCard";
import { FormatStoryCard } from "./FormatStoryCard";

const LocalPulseLazy = dynamic(
  () =>
    import("./LocalPulseModule").then((m) => ({ default: m.LocalPulseModule })),
  { ssr: false, loading: () => null }
);

const JanDarpanLivePreviewLazy = dynamic(
  () =>
    import("@/features/jd-live").then((m) => ({ default: m.JanDarpanLivePreview })),
  { ssr: false, loading: () => null }
);

const JanDarpanLiveLazy = dynamic(
  () =>
    import("@/features/jd-live").then((m) => ({ default: m.JanDarpanLive })),
  {
    ssr: false,
    loading: () => (
      <div
        className="jdl-studio-loading-placeholder"
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          maxHeight: 640,
          background: "#0a1628",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
          color: "rgba(255,255,255,0.6)",
          fontFamily: "sans-serif",
          fontSize: 14,
          marginTop: 10,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid rgba(255,255,255,0.1)",
            borderTopColor: "#c8102e",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span>जन दर्पण लाइव लोड हो रहा है…</span>
      </div>
    ),
  }
);

type SlotProps = {
  feed: GeneratedHomepageFeed;
  excludeSlugs: Set<string>;
};

/**
 * Jan Darpan Live newsroom — primary first-content experience on the homepage.
 * Replaces the previous "आज का दर्पण / Today's Brief" module.
 */
export function AliveHomeBriefingSlot({ feed, excludeSlugs }: SlotProps) {
  const { locale } = useJdDsT();
  const broadcastLang = locale === "en" ? "en" : "hi";

  return (
    <section
      className="jd-home-live-newsroom-fullbleed"
      data-testid="jd-live-newsroom"
      aria-label={broadcastLang === "en" ? "Jan Darpan Live Newsroom" : "जन दर्पण लाइव न्यूज़रूम"}
    >
      <JanDarpanLiveLazy initialLanguage={broadcastLang} embedded />
    </section>
  );
}

/**
 * Local pulse / discussion / developing — after lead, before section streams.
 * Lazy-loads pulse to keep LCP on the lead.
 */
export function AliveHomeSecondarySlot({ feed, excludeSlugs }: SlotProps) {
  const { locale, t } = useJdDsT();
  const prefs = useReaderPreferencesOptional();
  const districtSlug =
    prefs?.prefs.homeDistrict?.trim() || DEFAULT_DISTRICT_SLUG;

  const briefingSlugs = useMemo(() => {
    const briefing = buildDailyDarpan(feed, { districtSlug, excludeSlugs });
    return new Set(briefing?.items.map((i) => i.slug) ?? []);
  }, [feed, districtSlug, excludeSlugs]);

  const claimed = useMemo(() => {
    const next = new Set(excludeSlugs);
    for (const s of briefingSlugs) next.add(s);
    return next;
  }, [excludeSlugs, briefingSlugs]);

  const pulse = useMemo(
    () => buildLocalPulse(feed, { districtSlug, limit: 4 }),
    [feed, districtSlug]
  );

  const developing = useMemo(
    () =>
      pickDevelopingStory(feed, {
        districtSlug,
        excludeSlugs: claimed,
      }),
    [feed, districtSlug, claimed]
  );

  const discussion = useMemo(() => {
    const seen = new Set(claimed);
    if (developing) seen.add(developing.slug);
    const out = [];
    for (const a of feed.trending ?? []) {
      if (!a?.slug || seen.has(a.slug)) continue;
      out.push(toFormattedStory(a, locale));
      seen.add(a.slug);
      if (out.length >= 4) break;
    }
    return out;
  }, [feed.trending, claimed, developing, locale]);

  return (
    <div className="jd-alive-secondary" data-testid="jd-alive-secondary">
      {pulse ? <LocalPulseLazy pulse={pulse} /> : null}

      {discussion.length >= 2 ? (
        <section
          className="jd-alive-discussion"
          aria-label={t("home.discussion")}
        >
          <SectionHeader
            title={t("home.discussion")}
            color="var(--jd-red)"
            moreHref="/trending"
            moreLabel={t("common.seeAll")}
          />
          <div className="jd-home-section-cards">
            {discussion.map((s, i) => (
              <FormatStoryCard
                key={s.slug}
                story={s}
                last={i === discussion.length - 1}
                toneIndex={i}
              />
            ))}
          </div>
        </section>
      ) : null}

      {developing ? <DevelopingStoryTeaserCard teaser={developing} /> : null}
    </div>
  );
}

/**
 * Compact Jan Darpan Live preview for the homepage sidebar.
 * Lazy loaded — does NOT initialize audio or broadcast engine.
 */
export function AliveHomeLiveSlot({ feed }: { feed: SlotProps["feed"] }) {
  const { locale } = useJdDsT();
  // Pick the top story image + headline for the preview
  const topStory = feed.breakingTicker[0] ?? feed.liveWire[0] ?? feed.editorsPicks?.lead;
  return (
    <JanDarpanLivePreviewLazy
      headline={topStory?.headline}
      imageUrl={topStory?.imageUrl}
      language={locale === "en" ? "en" : "hi"}
    />
  );
}

/** @deprecated Prefer slot components */
export function AliveHomeModules(props: SlotProps) {
  return (
    <>
      <AliveHomeBriefingSlot {...props} />
      <AliveHomeSecondarySlot {...props} />
    </>
  );
}
