"use client";

import Link from "next/link";
import type { LocalPulseModel } from "@/lib/engagement/local-pulse";
import { useJdDsT } from "../i18n";
import { storyHref } from "../utils";

type LocalPulseModuleProps = {
  pulse: LocalPulseModel;
};

function PulseList({
  title,
  stories,
}: {
  title: string;
  stories: LocalPulseModel["nowStories"];
}) {
  if (!stories.length) return null;
  return (
    <div className="jd-pulse__block">
      <h3 className="jd-ui jd-pulse__block-title">{title}</h3>
      <ul className="jd-pulse__list">
        {stories.map((s) => (
          <li key={s.slug}>
            <Link href={storyHref(s.slug)} className="jd-serif jd-pulse__link">
              {s.headline}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Local Pulse — अभी / आज / चर्चा / आसपास.
 * Omits empty blocks; never invents utility feeds.
 */
export function LocalPulseModule({ pulse }: LocalPulseModuleProps) {
  const { locale, t } = useJdDsT();
  const name =
    locale === "en" ? pulse.districtNameEn : pulse.districtNameHi;

  return (
    <section
      className="jd-pulse"
      data-testid="jd-local-pulse"
      aria-label={t("pulse.title", { district: name })}
    >
      <header className="jd-pulse__head">
        <div>
          <h2 className="jd-serif jd-pulse__title">
            {t("pulse.title", { district: name })}
          </h2>
          <p className="jd-ui jd-pulse__sub">{t("pulse.subtitle")}</p>
        </div>
        {pulse.weatherTempC != null ? (
          <p className="jd-ui jd-pulse__weather" aria-label={t("util.weatherSource")}>
            {Math.round(pulse.weatherTempC)}°
            {pulse.weatherLabel ? ` · ${pulse.weatherLabel}` : ""}
          </p>
        ) : null}
      </header>

      <PulseList title={t("pulse.now")} stories={pulse.nowStories} />
      <PulseList title={t("pulse.today")} stories={pulse.todayStories} />
      <PulseList title={t("pulse.trending")} stories={pulse.trendingStories} />
      <PulseList title={t("pulse.nearby")} stories={pulse.nearbyStories} />

      {pulse.stateStories.length ? (
        <div className="jd-pulse__block jd-pulse__block--state">
          <h3 className="jd-ui jd-pulse__block-title">{t("pulse.state")}</h3>
          <ul className="jd-pulse__list">
            {pulse.stateStories.map((s) => (
              <li key={s.slug}>
                <Link href={storyHref(s.slug)} className="jd-serif jd-pulse__link">
                  {s.headline}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="jd-pulse__more">
        <Link href="/district" className="jd-ui">
          {t("pulse.openDistrict")} →
        </Link>
      </p>
    </section>
  );
}
