import Link from "next/link";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { SecondaryStory } from "../components/SecondaryStory";
import type { ReaderStory } from "../utils";

/** F54 — editorial 404 with paths forward. */
export function NotFoundStatePage({
  trending = [],
}: {
  trending?: ReaderStory[];
}) {
  return (
    <ReaderShell activeNav="home" reserveMiniPlayer={false} showPermissionSheets={false}>
      <Masthead back backHref="/" />
      <main
        id="main-content"
        role="main"
        className="jd-shell"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "34px 24px 20px",
          textAlign: "center",
        }}
      >
        <div className="jd-brand" style={{ fontSize: 72, fontWeight: 700, color: "var(--jd-red)", lineHeight: 1 }}>
          404
        </div>
        <h1 className="jd-serif" style={{ margin: "6px 0 8px", fontSize: 20, fontWeight: 700 }}>
          यह पृष्ठ नहीं मिला
        </h1>
        <p
          className="jd-ui"
          style={{ margin: "0 0 20px", fontSize: 13, color: "var(--jd-ink-3)", lineHeight: 1.6, maxWidth: 250 }}
        >
          शायद कड़ी पुरानी हो गई या पृष्ठ हटा दिया गया। नीचे से आगे बढ़ें।
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap", justifyContent: "center" }}>
          <Link
            href="/"
            className="jd-ui"
            style={{
              background: "var(--jd-red)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              padding: "11px 20px",
              borderRadius: 3,
              textDecoration: "none",
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            होम पर जाएँ
          </Link>
          <Link
            href="/search"
            className="jd-ui"
            style={{
              border: "1.5px solid var(--jd-navy)",
              color: "var(--jd-navy)",
              fontWeight: 700,
              fontSize: 13,
              padding: "10px 20px",
              borderRadius: 3,
              textDecoration: "none",
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            खोजें
          </Link>
        </div>
        {trending.length > 0 ? (
          <div style={{ width: "100%", borderTop: "1px solid var(--jd-line-2)", paddingTop: 14, textAlign: "left" }}>
            <div
              className="jd-ui"
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: ".08em",
                color: "var(--jd-muted)",
                marginBottom: 10,
              }}
            >
              अभी ट्रेंडिंग
            </div>
            {trending.slice(0, 3).map((s, i) => (
              <SecondaryStory key={s.slug} story={s} last={i === Math.min(2, trending.length - 1)} toneIndex={i} />
            ))}
          </div>
        ) : null}
      </main>
    </ReaderShell>
  );
}
