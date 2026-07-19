import type { HomeArticle } from "@/lib/homepage/types";
import { Ad } from "../components/Ad";
import { DistrictContextBar } from "../components/DistrictContextBar";
import { LeadStory } from "../components/LeadStory";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { SectionHeader } from "../components/primitives";
import { SecondaryStory } from "../components/SecondaryStory";
import { JdIcon, type JdIconName } from "../components/icons";
import { toReaderStory } from "../utils";

type UtilityTile = {
  icon: JdIconName;
  title: string;
  subtitle: string;
};

type Props = {
  districtName: string;
  districtNameHi: string;
  articles: HomeArticle[];
  utilityTiles?: UtilityTile[];
  sponsorLabel?: string | null;
};

const DEFAULT_UTILS: UtilityTile[] = [
  { icon: "rupee", title: "मंडी भाव", subtitle: "आज की जानकारी" },
  { icon: "bolt", title: "बिजली", subtitle: "स्थानीय अपडेट" },
  { icon: "pin", title: "परिवहन", subtitle: "स्थानीय अपडेट" },
  { icon: "rain", title: "मौसम", subtitle: "ज़िला पूर्वानुमान" },
];

/** A2 — ज़िला होमपेज */
export function DistrictHomepage({
  districtName,
  districtNameHi,
  articles,
  utilityTiles = DEFAULT_UTILS,
  sponsorLabel,
}: Props) {
  const lead = articles[0] ? toReaderStory(articles[0], `${districtNameHi} · स्थानीय`) : null;
  const rest = articles.slice(1, 8).map((a) => toReaderStory(a));
  const countLabel = articles.length > 0 ? `${articles.length} ख़बरें` : undefined;

  return (
    <ReaderShell activeNav="district">
      <Masthead pageTitle={districtNameHi || districtName} />
      <DistrictContextBar nameHi={districtNameHi || districtName} newsCountLabel={countLabel} />
      <main id="main-content" role="main" style={{ flex: 1, background: "var(--jd-paper)" }}>
        {lead ? <LeadStory story={lead} /> : (
          <p className="jd-ui" style={{ padding: 16, color: "var(--jd-muted)", fontSize: 14 }}>
            इस ज़िले की ख़बरें जल्द उपलब्ध होंगी।
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
              }}
            >
              ज़िला प्रायोजक
            </span>
            <span className="jd-ui" style={{ fontSize: 12, color: "var(--jd-ink-2)", fontWeight: 600 }}>
              {sponsorLabel}
            </span>
          </div>
        ) : null}

        <SectionHeader title="स्थानीय उपयोगिता" color="var(--jd-navy)" />
        <div
          style={{
            margin: "0 14px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {utilityTiles.map((u) => (
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
              <JdIcon name={u.icon} size={20} stroke={1.8} color="var(--jd-navy)" />
              <div>
                <div className="jd-ui" style={{ fontSize: 11, fontWeight: 800, color: "var(--jd-ink)" }}>
                  {u.title}
                </div>
                <div className="jd-ui" style={{ fontSize: 10.5, color: "var(--jd-ink-3)" }}>
                  {u.subtitle}
                </div>
              </div>
            </div>
          ))}
        </div>

        <SectionHeader title={`${districtNameHi || districtName} की ख़बरें`} moreHref={`/latest?district=${encodeURIComponent(districtNameHi)}`} />
        <div style={{ padding: "0 14px" }}>
          {rest.length === 0 ? (
            <p className="jd-ui" style={{ color: "var(--jd-muted)", fontSize: 13, padding: "8px 0" }}>
              और स्थानीय ख़बरें जल्द जोड़ी जाएँगी।
            </p>
          ) : (
            rest.map((s, i) => (
              <SecondaryStory key={s.slug} story={s} last={i === rest.length - 1} toneIndex={i} />
            ))
          )}
        </div>
        <Ad label="विज्ञापन · ज़िला" />
      </main>
    </ReaderShell>
  );
}
