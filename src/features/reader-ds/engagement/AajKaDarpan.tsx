"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { DailyDarpanBriefing } from "@/lib/engagement/daily-darpan";
import type { GeneratedHomepageFeed, HomeArticle } from "@/lib/homepage/types";
import {
  markBriefingItemConsumed,
  readBriefingConsumed,
} from "@/lib/engagement/story-state";
import { ArticleImage } from "../components/ArticleImage";
import { useJdDsT } from "../i18n";
import { storyHref } from "../utils";

type AajKaDarpanProps = {
  briefing: DailyDarpanBriefing;
  feed?: GeneratedHomepageFeed;
};

function consumedKey(b: DailyDarpanBriefing) {
  return `${b.dateKey}:${b.dayPart}:${b.districtSlug}`;
}

/**
 * Flagship daily briefing — district + daypart aware.
 * Desktop: Two-column layout (72% Today's Brief + 28% Live News / Important Articles).
 * Mobile: Clean vertical reading flow.
 */
export function AajKaDarpan({ briefing, feed }: AajKaDarpanProps) {
  const { locale, t } = useJdDsT();
  const [epoch, setEpoch] = useState(0);
  const key = consumedKey(briefing);

  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener("storage", onStoreChange);
    return () => window.removeEventListener("storage", onStoreChange);
  }, []);

  const consumed = useSyncExternalStore(
    subscribe,
    () => {
      void epoch;
      const prev = readBriefingConsumed();
      if (
        prev &&
        `${prev.dateKey}:${prev.dayPart}:${prev.districtSlug}` === key
      ) {
        return prev.consumedSlugs.join("|");
      }
      return "";
    },
    () => ""
  );

  const consumedSet = useMemo(
    () => new Set(consumed ? consumed.split("|").filter(Boolean) : []),
    [consumed]
  );

  const allDone = useMemo(
    () =>
      briefing.items.length > 0 &&
      briefing.items.every((item) => consumedSet.has(item.slug)),
    [briefing.items, consumedSet]
  );

  const district =
    locale === "en" ? briefing.districtLabelEn : briefing.districtLabelHi;
  const weekday = locale === "en" ? briefing.weekdayEn : briefing.weekdayHi;
  const title =
    locale === "en"
      ? briefing.copy.briefingTitleEn
      : briefing.copy.briefingTitleHi;
  const tone = locale === "en" ? briefing.copy.toneEn : briefing.copy.toneHi;

  const onOpen = (slug: string) => {
    markBriefingItemConsumed({
      dateKey: briefing.dateKey,
      dayPart: briefing.dayPart,
      districtSlug: briefing.districtSlug,
      slug,
    });
    setEpoch((n) => n + 1);
  };

  const sidebarStories = useMemo(() => {
    if (!feed) return [];
    const briefingSlugs = new Set(briefing.items.map((i) => i.slug));
    const pool = [
      ...(feed.editorsPicks?.supporting ?? []),
      ...(feed.trending ?? []),
      ...(feed.regionalHighlights ?? []),
      ...(feed.liveWire ?? []),
    ];
    const seen = new Set<string>();
    const list: HomeArticle[] = [];
    for (const a of pool) {
      if (!a?.slug || briefingSlugs.has(a.slug) || seen.has(a.slug)) continue;
      seen.add(a.slug);
      list.push(a);
      if (list.length >= 3) break;
    }
    return list;
  }, [feed, briefing.items]);

  return (
    <div className="jd-darpan-wrap">
      <section
        className="jd-darpan"
        data-testid="jd-aaj-ka-darpan"
        aria-label={t("darpan.title")}
      >
        <header className="jd-darpan__head">
          <div>
            <p className="jd-ui jd-darpan__eyebrow">{t("darpan.title")}</p>
            <p className="jd-ui jd-darpan__meta">
              {district}
              {weekday ? ` · ${weekday}` : ""}
              {tone ? ` · ${tone}` : ""}
            </p>
          </div>
          <Link href={briefing.listenHref} className="jd-darpan__listen jd-ui">
            {t("darpan.listenCta")}
          </Link>
        </header>

        {allDone ? (
          <p className="jd-ui jd-darpan__done" role="status">
            {t("darpan.allCaughtUp")}
          </p>
        ) : (
          <>
            <h2 className="jd-serif jd-darpan__title">{title}</h2>
            <ol className="jd-darpan__list">
              {briefing.items.map((item) => {
                const done = consumedSet.has(item.slug);
                return (
                  <li
                    key={item.slug}
                    className={done ? "jd-darpan__item is-done" : "jd-darpan__item"}
                  >
                    <Link
                      href={storyHref(item.slug)}
                      prefetch={false}
                      className="jd-darpan__link"
                      onClick={() => onOpen(item.slug)}
                    >
                      <span className="jd-ui jd-darpan__rank" aria-hidden>
                        {item.rank}
                      </span>
                      <span className="jd-serif jd-darpan__headline">
                        {item.isBreaking ? (
                          <span className="jd-darpan__breaking">
                            {t("common.breaking")}{" "}
                          </span>
                        ) : null}
                        {item.headline}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </section>

      {sidebarStories.length > 0 ? (
        <aside
          className="jd-darpan-side"
          aria-label={locale === "en" ? "Top Stories" : "प्रमुख खबरें"}
        >
          <div className="jd-darpan-side__head">
            <span className="jd-ui jd-darpan-side__kicker">
              {locale === "en" ? "LATEST UPDATES" : "ताज़ा अपडेट्स"}
            </span>
          </div>
          <div className="jd-darpan-side__items">
            {sidebarStories.map((story) => {
              const tagLabel =
                locale === "en"
                  ? (story.section === "chhattisgarh"
                      ? "Chhattisgarh"
                      : story.section === "raipur"
                      ? "Raipur"
                      : story.section === "india"
                      ? "India"
                      : story.categoryLabel || "News")
                  : (story.section === "chhattisgarh"
                      ? "छत्तीसगढ़"
                      : story.section === "raipur"
                      ? "रायपुर"
                      : story.section === "india"
                      ? "भारत"
                      : story.categoryLabel || "ख़बर");
              return (
                <Link
                  key={story.slug}
                  href={storyHref(story.slug)}
                  prefetch={false}
                  className="jd-darpan-side__item"
                >
                  <div className="jd-darpan-side__img">
                    <ArticleImage
                      src={story.imageUrl}
                      alt={story.headline}
                      altIsPhotoDescription={false}
                      ratio="thumb"
                      sizes="80px"
                      category={story.section || "general"}
                    />
                  </div>
                  <div className="jd-darpan-side__content">
                    <span className="jd-ui jd-darpan-side__tag">{tagLabel}</span>
                    <h3 className="jd-serif jd-darpan-side__headline">
                      {story.headline}
                    </h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>
      ) : null}
    </div>
  );
}
