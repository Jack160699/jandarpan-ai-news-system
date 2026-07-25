"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { DailyDarpanBriefing } from "@/lib/engagement/daily-darpan";
import {
  markBriefingItemConsumed,
  readBriefingConsumed,
} from "@/lib/engagement/story-state";
import { useJdDsT } from "../i18n";
import { storyHref } from "../utils";

type AajKaDarpanProps = {
  briefing: DailyDarpanBriefing;
};

function consumedKey(b: DailyDarpanBriefing) {
  return `${b.dateKey}:${b.dayPart}:${b.districtSlug}`;
}

/**
 * Flagship daily briefing — district + daypart aware.
 * Marks items consumed locally; no streaks/rewards.
 */
export function AajKaDarpan({ briefing }: AajKaDarpanProps) {
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

  return (
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
  );
}
