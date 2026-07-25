"use client";

import Link from "next/link";
import type { DevelopingStoryTeaser } from "@/lib/engagement/pick-developing";
import { useJdDsT } from "../i18n";
import { storyHref } from "../utils";

type DevelopingStoryTeaserCardProps = {
  teaser: DevelopingStoryTeaser;
};

export function DevelopingStoryTeaserCard({
  teaser,
}: DevelopingStoryTeaserCardProps) {
  const { locale, t } = useJdDsT();
  const hint = locale === "en" ? teaser.updateHintEn : teaser.updateHintHi;

  return (
    <section
      className="jd-developing"
      data-testid="jd-developing-story"
      aria-label={t("developing.title")}
    >
      <div className="jd-developing__kicker jd-ui">
        <span className="jd-developing__dot" aria-hidden />
        {hint}
      </div>
      <h2 className="jd-serif jd-developing__title">
        <Link href={storyHref(teaser.slug)}>{teaser.headline}</Link>
      </h2>
      {teaser.summary ? (
        <p className="jd-ui jd-developing__summary">{teaser.summary}</p>
      ) : null}
      <div className="jd-developing__actions">
        <Link href={storyHref(teaser.slug)} className="jd-ui jd-developing__cta">
          {t("developing.openTimeline")} →
        </Link>
        <Link
          href={`/hub/${encodeURIComponent(teaser.slug)}`}
          className="jd-ui jd-developing__hub"
        >
          {t("developing.openHub")}
        </Link>
      </div>
    </section>
  );
}
