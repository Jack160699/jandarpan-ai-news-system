"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { GeneratedHomepageFeed } from "@/lib/homepage/types";
import { buildDailyDarpan } from "@/lib/engagement/daily-darpan";
import { buildLocalPulse } from "@/lib/engagement/local-pulse";
import { pickDevelopingStory } from "@/lib/engagement/pick-developing";
import { toFormattedStory } from "@/lib/engagement/story-format";
import { getDayPartCopy } from "@/lib/engagement/time-of-day";
import { useReaderPreferencesOptional } from "@/providers/ReaderPreferencesProvider";
import { DEFAULT_DISTRICT_SLUG } from "@/lib/district-intelligence";
import { useJdDsT } from "../i18n";
import { SectionHeader } from "../components";
import { AajKaDarpan } from "./AajKaDarpan";
import { DevelopingStoryTeaserCard } from "./DevelopingStoryTeaserCard";
import { FormatStoryCard } from "./FormatStoryCard";

const LocalPulseLazy = dynamic(
  () =>
    import("./LocalPulseModule").then((m) => ({ default: m.LocalPulseModule })),
  { ssr: false, loading: () => null }
);

type SlotProps = {
  feed: GeneratedHomepageFeed;
  excludeSlugs: Set<string>;
};

/** Daypart tone + आज का दर्पण — sits above the lead story. */
export function AliveHomeBriefingSlot({ feed, excludeSlugs }: SlotProps) {
  const { locale } = useJdDsT();
  const prefs = useReaderPreferencesOptional();
  const districtSlug =
    prefs?.prefs.homeDistrict?.trim() || DEFAULT_DISTRICT_SLUG;
  const dayPart = getDayPartCopy();

  const briefing = useMemo(
    () => buildDailyDarpan(feed, { districtSlug, excludeSlugs }),
    [feed, districtSlug, excludeSlugs]
  );

  const toneLabel = locale === "en" ? dayPart.toneEn : dayPart.toneHi;

  return (
    <div
      className="jd-alive"
      data-testid="jd-alive-home"
      data-daypart={dayPart.dayPart}
    >
      <p className="jd-ui jd-alive__tone" aria-live="polite">
        {toneLabel}
      </p>
      {briefing ? <AajKaDarpan briefing={briefing} /> : null}
    </div>
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

/** @deprecated Prefer slot components */
export function AliveHomeModules(props: SlotProps) {
  return (
    <>
      <AliveHomeBriefingSlot {...props} />
      <AliveHomeSecondarySlot {...props} />
    </>
  );
}
