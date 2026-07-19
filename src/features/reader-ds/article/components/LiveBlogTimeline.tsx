import { hindiRelativeTime } from "../../utils";

export type LiveBlogEntry = {
  id: string;
  headline: string;
  summary?: string | null;
  publishedAt: string;
  isBreaking?: boolean;
};

function compactTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const min = Math.round((Date.now() - then) / 60000);
  if (min < 1) return "अभी";
  if (min < 60) return `${min} मि`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} घं`;
  return hindiRelativeTime(iso).replace(" पहले", "") || "";
}

/** B13 — reverse-chrono timeline entries. */
export function LiveBlogTimeline({ entries }: { entries: LiveBlogEntry[] }) {
  if (!entries.length) {
    return (
      <p className="jd-ui" style={{ color: "var(--jd-muted)", fontSize: 13, padding: "8px 0" }}>
        अभी कोई नई प्रविष्टि नहीं। कवरेज अपडेट होते ही यहाँ दिखेगी।
      </p>
    );
  }

  return (
    <div>
      {entries.map((e, i) => {
        const fresh = i === 0 || Boolean(e.isBreaking);
        return (
          <div key={e.id} style={{ display: "flex", gap: 12, paddingBottom: 16 }}>
            <div style={{ flexShrink: 0, width: 40, textAlign: "right" }}>
              <div
                className="jd-ui"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: fresh ? "var(--jd-red)" : "var(--jd-muted)",
                }}
              >
                {compactTime(e.publishedAt)}
              </div>
            </div>
            <div style={{ borderLeft: "2px solid var(--jd-line)", paddingLeft: 12, flex: 1 }}>
              <div
                className="jd-serif"
                style={{
                  fontSize: 14.5,
                  lineHeight: 1.45,
                  color: "var(--jd-ink)",
                  fontWeight: fresh ? 700 : 500,
                }}
              >
                {e.headline}
              </div>
              {e.summary ? (
                <p
                  className="jd-ui"
                  style={{
                    margin: "4px 0 0",
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: "var(--jd-ink-3)",
                  }}
                >
                  {e.summary}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
