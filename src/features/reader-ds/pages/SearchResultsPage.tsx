import Link from "next/link";
import type { SearchHit } from "@/lib/search/types";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { SecondaryStory } from "../components/SecondaryStory";
import { JdIcon } from "../components/icons";
import { Tag } from "../components/primitives";
import type { ReaderStory } from "../utils";

type TopicSuggestion = {
  title: string;
  href: string;
  label?: string;
};

type Props = {
  query: string;
  total: number;
  hits: SearchHit[];
  topicSuggestion?: TopicSuggestion | null;
};

function hitToStory(hit: SearchHit): ReaderStory {
  return {
    slug: hit.slug,
    headline: hit.headline,
    kicker: `लेख · ${hit.section}`,
    summary: hit.summary,
    imageUrl: hit.imageUrl,
    publishedAt: hit.publishedAt,
  };
}

/** A7 — खोज परिणाम */
export function SearchResultsPageView({ query, total, hits, topicSuggestion }: Props) {
  const stories = hits.map(hitToStory);

  return (
    <ReaderShell activeNav="home">
      <Masthead back pageTitle="खोज" backHref="/" />
      <div
        className="jd-ui"
        style={{
          flexShrink: 0,
          padding: "8px 14px",
          background: "#fff",
          borderBottom: "1px solid var(--jd-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 12.5, color: "var(--jd-ink-3)" }}>
          <b style={{ color: "var(--jd-ink)" }}>&ldquo;{query}&rdquo;</b> के {total} परिणाम
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12,
            fontWeight: 700,
            color: "var(--jd-navy)",
          }}
        >
          <JdIcon name="filter" size={15} stroke={1.8} color="var(--jd-navy)" />
          फ़िल्टर
        </span>
      </div>

      <main id="main-content" role="main" style={{ flex: 1, background: "var(--jd-paper)" }}>
        {topicSuggestion ? (
          <div
            style={{
              margin: "10px 14px",
              background: "#fbf3e6",
              border: "1px solid var(--jd-gold)",
              borderRadius: 2,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div>
              <div className="jd-ui" style={{ fontSize: 11, color: "var(--jd-amber)", fontWeight: 800 }}>
                {topicSuggestion.label ?? "टॉपिक"}
              </div>
              <div className="jd-serif" style={{ fontSize: 15, fontWeight: 700, color: "var(--jd-ink)" }}>
                {topicSuggestion.title}
              </div>
            </div>
            <Link
              href={topicSuggestion.href}
              className="jd-ui"
              style={{
                fontSize: 11.5,
                fontWeight: 800,
                color: "#fff",
                background: "var(--jd-red)",
                padding: "6px 12px",
                borderRadius: 2,
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              देखें
            </Link>
          </div>
        ) : null}

        <div style={{ padding: "0 14px" }}>
          {stories.length === 0 ? (
            <p className="jd-ui" style={{ padding: "20px 0", color: "var(--jd-muted)", fontSize: 14 }}>
              कोई परिणाम नहीं मिला। दूसरी खोज आज़माएँ।
            </p>
          ) : (
            stories.map((s, i) => (
              <SecondaryStory key={s.slug} story={s} last={i === stories.length - 1} toneIndex={i} />
            ))
          )}
        </div>

        {query ? (
          <div style={{ padding: "8px 14px 20px" }}>
            <Tag color="var(--jd-muted)">मिलान: {query}</Tag>
          </div>
        ) : null}
      </main>
    </ReaderShell>
  );
}
