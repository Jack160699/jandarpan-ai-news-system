"use client";

import type { HomeArticle } from "@/lib/homepage/types";
import { DistrictContextBar } from "../components/DistrictContextBar";
import { LeadStory } from "../components/LeadStory";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { SectionHeader } from "../components/primitives";
import { SecondaryStory } from "../components/SecondaryStory";
import { JdIcon, jdIconStroke, type JdIconName } from "../components/icons";
import { useJdDsT } from "../i18n";
import { toReaderStory } from "../utils";
import { DurgSolarInlineAd } from "@/components/ads/DurgSolarInlineAd";
import React from "react";

type UtilityTile = {
  icon: JdIconName;
  title: string;
  subtitle: string;
};

type Props = {
  districtName: string;
  districtNameHi: string;
  articles: HomeArticle[];
  /** Statewide/nearby stories — shown only when local inventory is thin. */
  fallbackArticles?: HomeArticle[];
  utilityTiles?: UtilityTile[];
  sponsorLabel?: string | null;
};

const DEFAULT_UTILS_HI: UtilityTile[] = [
  { icon: "rupee", title: "मंडी भाव", subtitle: "आज की जानकारी" },
  { icon: "bolt", title: "बिजली", subtitle: "स्थानीय अपडेट" },
  { icon: "pin", title: "परिवहन", subtitle: "स्थानीय अपडेट" },
  { icon: "rain", title: "मौसम", subtitle: "ज़िला पूर्वानुमान" },
];

const DEFAULT_UTILS_EN: UtilityTile[] = [
  { icon: "rupee", title: "Mandi rates", subtitle: "Today's info" },
  { icon: "bolt", title: "Power", subtitle: "Local updates" },
  { icon: "pin", title: "Transport", subtitle: "Local updates" },
  { icon: "rain", title: "Weather", subtitle: "District forecast" },
];

/** A2 — district homepage + Phase 6 newspaper grid (chrome i18n; stories stay CMS). */
export function DistrictHomepage({
  districtName,
  districtNameHi,
  articles,
  fallbackArticles = [],
  utilityTiles,
  sponsorLabel,
}: Props) {
  const { t, locale } = useJdDsT();
  const displayName = locale === "en" ? districtName || districtNameHi : districtNameHi || districtName;
  const tiles = utilityTiles ?? (locale === "en" ? DEFAULT_UTILS_EN : DEFAULT_UTILS_HI);
  const lead = articles[0]
    ? toReaderStory(articles[0], `${displayName}`)
    : null;
  const rest = articles.slice(1).map((a) => toReaderStory(a));
  const countLabel =
    articles.length > 0 ? t("district.newsCount", { n: articles.length }) : undefined;

  return (
    <ReaderShell activeNav="district">
      <Masthead />
      <DistrictContextBar
        nameHi={districtNameHi || districtName}
        nameEn={districtName || districtNameHi}
        newsCountLabel={countLabel}
      />
      <main id="main-content" role="main" className="jd-shell" style={{ flex: 1, background: "var(--jd-paper)" }}>
        <div className="jd-hub-layout">
          <div className="jd-hub-lead">
            {lead ? (
              <LeadStory story={lead} />
            ) : (
              <p className="jd-ui" style={{ padding: 16, color: "var(--jd-muted)", fontSize: 14 }}>
                {t("district.emptyFeed")}
              </p>
            )}

            {sponsorLabel ? (
              <div
                style={{
                  margin: "8px 14px",
                  background: "#fbf3e6",
                  border: "1px solid var(--jd-gold)",
                  borderRadius: 2,
                  padding: "8px 11px",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <span
                  className="jd-ui"
                  style={{
                    fontSize: 8.5,
                    fontWeight: 800,
                    letterSpacing: ".1em",
                    color: "var(--jd-amber)",
                    textTransform: "uppercase",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("district.sponsor")}
                </span>
                <span className="jd-ui" style={{ fontSize: 12, color: "var(--jd-ink-2)", fontWeight: 600 }}>
                  {sponsorLabel}
                </span>
              </div>
            ) : null}

            <SectionHeader
              title={t("district.utilities")}
              color="var(--jd-navy)"
              moreLabel={t("common.seeAll")}
            />
            <div
              style={{
                margin: "0 14px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              {tiles.map((u) => (
                <div
                  key={u.title}
                  style={{
                    display: "flex",
                    gap: 9,
                    alignItems: "center",
                    background: "#fff",
                    border: "1px solid var(--jd-line-2)",
                    padding: "11px 12px",
                    minHeight: 44,
                  }}
                >
                  <JdIcon
                    name={u.icon}
                    size={20}
                    stroke={jdIconStroke(20)}
                    color="var(--jd-navy)"
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="jd-ui"
                      style={{
                        fontSize: locale === "en" ? 10.5 : 11,
                        fontWeight: 800,
                        color: "var(--jd-ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {u.title}
                    </div>
                    <div className="jd-ui" style={{ fontSize: 10.5, color: "var(--jd-ink-3)" }}>
                      {u.subtitle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader
              title={t("district.storiesTitle", { name: displayName })}
              moreHref={`/latest?district=${encodeURIComponent(districtNameHi || districtName)}`}
              moreLabel={t("common.seeAll")}
            />
            <div className="jd-hub-list" style={{ padding: "0 14px" }} data-testid="jd-district-primary">
              {rest.length === 0 && !lead ? (
                <p className="jd-ui" style={{ color: "var(--jd-muted)", fontSize: 13, padding: "8px 0" }}>
                  {t("district.emptyMore")}
                </p>
              ) : rest.length === 0 ? (
                <p className="jd-ui" style={{ color: "var(--jd-muted)", fontSize: 13, padding: "8px 0" }}>
                  {t("district.moreSoon")}
                </p>
              ) : (
                rest.map((s, i) => {
                  const storyIndex = lead ? i + 2 : i + 1; // 1-indexed count in feed
                  const showAdAfter = storyIndex % 3 === 0;
                  return (
                    <React.Fragment key={s.slug}>
                      <SecondaryStory story={s} last={i === rest.length - 1} toneIndex={i} />
                      {showAdAfter && (
                        <DurgSolarInlineAd index={Math.floor(storyIndex / 3)} />
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </ReaderShell>
  );
}
