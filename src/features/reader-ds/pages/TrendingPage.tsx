import type { HomeArticle } from "@/lib/homepage/types";
import { ChipRow } from "../components/ChipRow";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { TrendingRankRow } from "../components/TrendingRankRow";
import { JdIcon } from "../components/icons";
import { formatViewLabel, toReaderStory } from "../utils";

type Props = {
  articles: HomeArticle[];
  topicChips?: string[];
};

/** A5 — ट्रेंडिंग */
export function TrendingPageView({ articles, topicChips = [] }: Props) {
  const stories = articles.slice(0, 20).map((a, i) => {
    const base = toReaderStory(a);
    return {
      ...base,
      viewCountLabel: formatViewLabel(a.priorityScore || a.trendScore),
      growthLabel: i < 5 && a.ranking?.isTrending ? "▲ ट्रेंडिंग" : undefined,
    };
  });

  const chips =
    topicChips.length > 0
      ? topicChips.slice(0, 6).map((t) => ({
          label: t.startsWith("#") ? t : `#${t}`,
          href: `/search?q=${encodeURIComponent(t.replace(/^#/, ""))}`,
        }))
      : [{ label: "#ट्रेंडिंग", href: "/trending" }];

  return (
    <ReaderShell activeNav="latest">
      <Masthead pageTitle="ट्रेंडिंग" />
      <div
        className="jd-ui"
        style={{
          flexShrink: 0,
          padding: "9px 14px",
          background: "var(--jd-paper-2)",
          borderBottom: "1px solid var(--jd-line)",
          display: "flex",
          alignItems: "center",
          gap: 7,
        }}
      >
        <JdIcon name="fire" size={16} stroke={1.9} color="var(--jd-red)" />
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--jd-ink-2)" }}>
          पिछले 24 घंटे में छत्तीसगढ़ में सर्वाधिक पढ़ी गईं
        </span>
      </div>
      <ChipRow chips={chips} activeIndex={0} />
      <main id="main-content" role="main" style={{ flex: 1, background: "var(--jd-paper)" }}>
        <div style={{ padding: "2px 14px" }}>
          {stories.length === 0 ? (
            <p className="jd-ui" style={{ padding: "16px 0", color: "var(--jd-muted)", fontSize: 14 }}>
              ट्रेंडिंग ख़बरें जल्द यहाँ दिखेंगी।
            </p>
          ) : (
            stories.map((s, i) => (
              <TrendingRankRow key={s.slug} story={s} rank={i + 1} last={i === stories.length - 1} />
            ))
          )}
        </div>
      </main>
    </ReaderShell>
  );
}
