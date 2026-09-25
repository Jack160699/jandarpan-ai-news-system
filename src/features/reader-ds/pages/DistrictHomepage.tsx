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
import Link from "next/link";
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
  /** Ignored: strict district scoping prohibits injecting unrelated district stories */
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

/**
 * My Jila — Complete District News Experience.
 * Strict district scoping (zero unrelated filler stories).
 * Prominent district identity banner, lead story, fresh district stories,
 * and transparent indicators if local inventory is limited.
 */
export function DistrictHomepage({
  districtName,
  districtNameHi,
  articles,
  utilityTiles,
  sponsorLabel,
}: Props) {
  const { t, locale } = useJdDsT();
  const displayName = locale === "en" ? districtName || districtNameHi : districtNameHi || districtName;
  const tiles = utilityTiles ?? (locale === "en" ? DEFAULT_UTILS_EN : DEFAULT_UTILS_HI);

  // Strict district partitioning
  const leadArticle = articles[0] ? toReaderStory(articles[0], displayName) : null;
  const freshArticles = articles.slice(1, 6).map((a) => toReaderStory(a));
  const olderArticles = articles.slice(6).map((a) => toReaderStory(a));

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
        {/* Prominent District Identity Header */}
        <section
          style={{
            padding: "16px 14px 14px",
            background: "#ffffff",
            borderBottom: "1px solid var(--jd-line)",
          }}
          data-testid="jd-district-header"
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: ".08em",
                    color: "var(--jd-navy)",
                    textTransform: "uppercase",
                  }}
                >
                  {locale === "en" ? "MY JILA" : "मेरा ज़िला"}
                </span>
                <span style={{ color: "var(--jd-line-2)" }}>—</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: "var(--jd-red)", letterSpacing: ".04em" }}>
                  {displayName.toUpperCase()}
                </span>
              </div>
              <h1
                className="jd-serif"
                style={{
                  margin: "2px 0 4px",
                  fontSize: "clamp(20px, 4vw, 28px)",
                  fontWeight: 800,
                  color: "var(--jd-ink)",
                  lineHeight: 1.25,
                }}
              >
                {locale === "en" ? `${displayName} District News` : `${displayName} ज़िला समाचार`}
              </h1>
              <p style={{ margin: 0, fontSize: 12.5, color: "var(--jd-muted)" }}>
                {locale === "en"
                  ? `Verified hyperlocal reporting & latest updates from ${displayName}`
                  : `${displayName} ज़िले की सभी विश्वसनीय खबरें, स्थानीय घटनाक्रम एवं ज़मीनी रिपोर्ट`}
              </p>
            </div>

            <Link
              href="/district?select=1"
              className="jd-ui"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "7px 14px",
                borderRadius: 4,
                background: "var(--jd-paper-2, #f8fafc)",
                border: "1px solid var(--jd-line)",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--jd-ink)",
                textDecoration: "none",
                alignSelf: "flex-start",
                marginTop: 2,
              }}
            >
              <JdIcon name="pin" size={14} stroke={2} color="var(--jd-red)" />
              <span>{locale === "en" ? "Change District" : "ज़िला बदलें"}</span>
            </Link>
          </div>

          {/* District Sponsor if available */}
          {sponsorLabel && (
            <div
              style={{
                marginTop: 12,
                background: "#fbf3e6",
                border: "1px solid var(--jd-gold)",
                borderRadius: 4,
                padding: "7px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                className="jd-ui"
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: ".08em",
                  color: "var(--jd-amber)",
                  textTransform: "uppercase",
                  flexShrink: 0,
                }}
              >
                {t("district.sponsor")}
              </span>
              <span className="jd-ui" style={{ fontSize: 12, color: "var(--jd-ink-2)", fontWeight: 600 }}>
                {sponsorLabel}
              </span>
            </div>
          )}
        </section>

        {/* District News Content */}
        <div className="jd-hub-layout" style={{ padding: "0 0 32px" }}>
          {/* Main Lead District Story */}
          <div className="jd-hub-lead">
            {leadArticle ? (
              <div style={{ marginBottom: 20 }}>
                <SectionHeader
                  title={locale === "en" ? "Lead Story" : "मुख्य खबर"}
                  color="var(--jd-red)"
                />
                <div style={{ padding: "0 14px" }}>
                  <LeadStory story={leadArticle} />
                </div>
              </div>
            ) : (
              <div
                style={{
                  margin: "16px 14px",
                  padding: "24px 18px",
                  background: "#ffffff",
                  border: "1px solid var(--jd-line)",
                  borderRadius: 6,
                  textAlign: "center",
                }}
              >
                <JdIcon name="pin" size={28} stroke={1.5} color="var(--jd-muted)" />
                <h3 style={{ margin: "10px 0 6px", fontSize: 15, fontWeight: 700, color: "var(--jd-ink)" }}>
                  {locale === "en" ? `No reports for ${displayName} yet` : `${displayName} से अभी कोई पुष्टि प्राप्त खबर नहीं`}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--jd-muted)", lineHeight: 1.4 }}>
                  {locale === "en"
                    ? "Jan Darpan strictly isolates district feeds. Unrelated news from other districts is never injected."
                    : "जन दर्पण ज़िला खबरों की सत्यता बनाए रखता है। किसी अन्य ज़िले की खबर को यहाँ नहीं दिखाया जाता।"}
                </p>
              </div>
            )}

            {/* Fresh District Stories */}
            {freshArticles.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionHeader
                  title={locale === "en" ? `Fresh ${displayName} Stories` : `ताज़ा जिला खबरें`}
                  color="var(--jd-navy)"
                />
                <div className="jd-hub-list" style={{ padding: "0 14px" }} data-testid="jd-district-fresh">
                  {freshArticles.map((s, i) => {
                    const showAdAfter = (i + 1) === 3;
                    return (
                      <React.Fragment key={s.slug}>
                        <SecondaryStory story={s} last={i === freshArticles.length - 1} toneIndex={i} />
                        {showAdAfter && <DurgSolarInlineAd index={1} />}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Older / Archival District Stories */}
            {olderArticles.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionHeader
                  title={locale === "en" ? "More District Stories" : "पुरानी लेकिन प्रासंगिक जिला खबरें"}
                  color="var(--jd-ink-3)"
                />
                <div className="jd-hub-list" style={{ padding: "0 14px" }} data-testid="jd-district-older">
                  {olderArticles.map((s, i) => (
                    <SecondaryStory key={s.slug} story={s} last={i === olderArticles.length - 1} toneIndex={i + 5} />
                  ))}
                </div>
              </div>
            )}

            {/* Transparent indicator if local inventory is limited */}
            {articles.length > 0 && articles.length < 4 && (
              <div
                style={{
                  margin: "12px 14px",
                  padding: "12px 14px",
                  background: "#f8fafc",
                  border: "1px dashed var(--jd-line)",
                  borderRadius: 4,
                  fontSize: 12,
                  color: "var(--jd-muted)",
                  lineHeight: 1.4,
                }}
              >
                <strong>{locale === "en" ? "Editorial Note: " : "संपादकीय सूचना: "}</strong>
                {locale === "en"
                  ? `Currently showing ${articles.length} verified stor${articles.length === 1 ? "y" : "ies"} for ${displayName}. More reports will appear as correspondents file updates.`
                  : `${displayName} के लिए वर्तमान में ${articles.length} सत्यापित खबरें उपलब्ध हैं। नए घटनाक्रमों की पुष्टि होते ही यहाँ अपडेट प्रसारित होगा।`}
              </div>
            )}
          </div>

          {/* District Utilities Section */}
          <div style={{ padding: "0 14px" }}>
            <SectionHeader
              title={t("district.utilities")}
              color="var(--jd-navy)"
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 8,
                marginBottom: 20,
              }}
            >
              {tiles.map((u) => (
                <div
                  key={u.title}
                  style={{
                    display: "flex",
                    gap: 9,
                    alignItems: "center",
                    background: "#ffffff",
                    border: "1px solid var(--jd-line)",
                    borderRadius: 4,
                    padding: "10px 12px",
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
                        fontSize: locale === "en" ? 11 : 11.5,
                        fontWeight: 800,
                        color: "var(--jd-ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {u.title}
                    </div>
                    <div className="jd-ui" style={{ fontSize: 10, color: "var(--jd-muted)" }}>
                      {u.subtitle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </ReaderShell>
  );
}
