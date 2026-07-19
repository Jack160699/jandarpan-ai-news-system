import { JsonLdScript } from "@/components/seo/JsonLdScript";
import type { EvolvingCoverageBundle } from "@/lib/news/coverage/read";
import { SITE_URL } from "@/lib/seo/constants";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { LiveBlogTimeline, type LiveBlogEntry } from "./components/LiveBlogTimeline";

function buildLiveBlogJsonLd(bundle: EvolvingCoverageBundle, headline: string, url: string) {
  const { event, liveBlocks } = bundle;
  return {
    "@context": "https://schema.org",
    "@type": "LiveBlogPosting",
    headline,
    description: event.event_summary,
    url,
    datePublished: event.created_at,
    dateModified: event.updated_at,
    coverageStartTime: event.created_at,
    coverageEndTime: event.is_live ? undefined : event.updated_at,
    liveBlogUpdate: liveBlocks.slice(0, 40).map((b) => ({
      "@type": "BlogPosting",
      headline: b.headline,
      datePublished: b.publishedAt,
      articleBody: b.summary ?? b.headline,
    })),
  };
}

/** Real pin metrics only — never invented match scores. */
function pinStats(bundle: EvolvingCoverageBundle): Array<[string, string]> {
  const { event } = bundle;
  const items: Array<[string, string]> = [];
  if (event.source_count > 0) items.push(["स्रोत", String(event.source_count)]);
  if (event.category) items.push(["श्रेणी", event.category]);
  if (event.coverage_status) items.push(["स्थिति", event.coverage_status]);
  return items.slice(0, 3);
}

/**
 * B13 Live blog — /live/[slug] under reader DS.
 * Preserves LiveBlogPosting JSON-LD and real coverage updates.
 */
export function ReaderLiveBlogPage({ bundle }: { bundle: EvolvingCoverageBundle }) {
  const { event, liveBlocks } = bundle;
  const headline =
    event.coverage_headline?.trim() ||
    `${event.canonical_title} · लाइव अपडेट`;
  const slug = event.coverage_slug ?? "";
  const canonicalUrl = `${SITE_URL}/live/${slug}`;
  const pins = pinStats(bundle);

  const entries: LiveBlogEntry[] = liveBlocks.map((b) => ({
    id: b.id,
    headline: b.headline,
    summary: b.summary,
    publishedAt: b.publishedAt,
    isBreaking: b.isBreaking,
  }));

  return (
    <>
      <JsonLdScript data={buildLiveBlogJsonLd(bundle, headline, canonicalUrl)} />
      <ReaderShell activeNav="latest">
        <Masthead back backHref="/live" pageTitle="लाइव ब्लॉग" />

        <div
          style={{
            flexShrink: 0,
            background: "var(--jd-navy)",
            color: "var(--jd-paper)",
            padding: "11px 16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            {event.is_live ? (
              <>
                <span
                  aria-hidden
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 7,
                    background: "#e05a63",
                    boxShadow: "0 0 8px #e05a63",
                  }}
                />
                <span
                  className="jd-ui"
                  style={{ fontSize: 10.5, fontWeight: 800, color: "#e05a63" }}
                >
                  LIVE
                </span>
              </>
            ) : (
              <span className="jd-ui" style={{ fontSize: 10.5, fontWeight: 800, color: "#8ea0c4" }}>
                कवरेज
              </span>
            )}
          </div>
          <h1
            className="jd-serif"
            style={{
              margin: 0,
              fontSize: 19,
              fontWeight: 700,
              lineHeight: 1.3,
              overflowWrap: "anywhere",
            }}
          >
            {headline}
          </h1>
          {event.event_summary ? (
            <p
              className="jd-ui"
              style={{ margin: "6px 0 0", fontSize: 12, lineHeight: 1.45, color: "#8ea0c4" }}
            >
              {event.event_summary}
            </p>
          ) : null}
        </div>

        {pins.length > 0 ? (
          <div
            className="jd-ui"
            style={{
              flexShrink: 0,
              display: "flex",
              justifyContent: "space-around",
              background: "var(--jd-navy-deep)",
              color: "var(--jd-gold-soft)",
              padding: "8px 0",
            }}
          >
            {pins.map(([label, value]) => (
              <div key={label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 9.5, color: "#8ea0c4" }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ flex: 1, overflow: "auto", padding: "12px 16px" }}>
          <LiveBlogTimeline entries={entries} />
        </div>
      </ReaderShell>
    </>
  );
}
