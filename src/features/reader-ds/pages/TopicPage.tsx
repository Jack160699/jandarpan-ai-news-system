import type { HomeArticle } from "@/lib/homepage/types";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { SectionHeader, Tag } from "../components/primitives";
import { SecondaryStory } from "../components/SecondaryStory";
import { JdIcon } from "../components/icons";
import { toReaderStory } from "../utils";

type Props = {
  title: string;
  description?: string;
  categoryLabel?: string;
  articleCount?: number;
  articles: HomeArticle[];
};

/** A8 — टॉपिक पेज */
export function TopicPageView({
  title,
  description,
  categoryLabel = "टॉपिक",
  articleCount,
  articles,
}: Props) {
  const stories = articles.map((a) => toReaderStory(a));
  const metaParts = [
    articleCount != null ? `${articleCount} लेख` : null,
    description ? null : null,
  ].filter(Boolean);

  return (
    <ReaderShell activeNav="home">
      <Masthead back />
      <div
        style={{
          flexShrink: 0,
          background: "var(--jd-navy)",
          color: "var(--jd-paper)",
          padding: "16px 16px 14px",
        }}
      >
        <Tag color="var(--jd-gold)">{categoryLabel}</Tag>
        <h1 className="jd-serif" style={{ margin: "6px 0 4px", fontSize: 24, fontWeight: 700 }}>
          {title}
        </h1>
        {description ? (
          <p className="jd-ui" style={{ margin: "0 0 12px", fontSize: 12.5, color: "#8ea0c4", lineHeight: 1.45 }}>
            {description}
          </p>
        ) : (
          <div className="jd-ui" style={{ fontSize: 11.5, color: "#8ea0c4", marginBottom: 12 }}>
            {metaParts.join(" · ") || "टॉपिक अपडेट"}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            className="jd-ui"
            style={{
              flex: 1,
              textAlign: "center",
              background: "var(--jd-red)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              padding: "11px 0",
              borderRadius: 3,
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            फ़ॉलो करें
          </button>
          <button
            type="button"
            aria-label="सूचनाएँ"
            style={{
              width: 44,
              height: 44,
              border: "1.5px solid #33477a",
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <JdIcon name="bell" size={20} stroke={1.9} color="var(--jd-gold-soft)" />
          </button>
        </div>
      </div>

      <main id="main-content" role="main" style={{ flex: 1, background: "var(--jd-paper)" }}>
        <SectionHeader title="इस टॉपिक पर" />
        <div style={{ padding: "0 14px" }}>
          {stories.length === 0 ? (
            <p className="jd-ui" style={{ color: "var(--jd-muted)", fontSize: 14, padding: "8px 0" }}>
              इस टॉपिक पर अभी कोई लेख नहीं है।
            </p>
          ) : (
            stories.map((s, i) => (
              <SecondaryStory key={s.slug} story={s} last={i === stories.length - 1} toneIndex={i} />
            ))
          )}
        </div>
      </main>
    </ReaderShell>
  );
}
