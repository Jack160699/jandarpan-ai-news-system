import Link from "next/link";
import type { HomeArticle } from "@/lib/homepage/types";
import { ArticleImage } from "../components/ArticleImage";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { JdIcon } from "../components/icons";
import { hindiRelativeTime, storyHref, toReaderStory } from "../utils";

type Props = {
  articles: HomeArticle[];
  /** True when there is active live/breaking coverage (not a fake viewer count). */
  isLiveActive: boolean;
  heroTitle?: string;
};

/** A9 — लाइव न्यूज़ (dark canvas only in this mode) */
export function LiveNewsPageView({ articles, isLiveActive, heroTitle }: Props) {
  const lead = articles[0];
  const updates = articles.slice(0, 12).map((a) => toReaderStory(a));
  const title = heroTitle || lead?.headline || "लाइव अपडेट";

  return (
    <ReaderShell activeNav="latest" dark>
      {isLiveActive ? (
        <div
          style={{
            flexShrink: 0,
            background: "#05080f",
            padding: "9px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/" aria-label="वापस" style={{ display: "flex", color: "#e7edf6" }}>
              <JdIcon name="arrowL" size={22} stroke={2} color="#e7edf6" />
            </Link>
            <span className="jd-serif" style={{ fontSize: 17, fontWeight: 700, color: "#e7edf6" }}>
              लाइव अपडेट
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
              style={{
                fontSize: 10.5,
                fontWeight: 800,
                color: "#e05a63",
                letterSpacing: ".08em",
              }}
            >
              LIVE
            </span>
          </div>
        </div>
      ) : (
        <Masthead back pageTitle="लाइव" />
      )}

      <main id="main-content" role="main" style={{ flex: 1, background: "#05080f" }}>
        {!isLiveActive ? (
          <div style={{ padding: 20 }}>
            <p className="jd-serif" style={{ fontSize: 18, fontWeight: 700, color: "#e7edf6", margin: "0 0 8px" }}>
              अभी कोई लाइव कवरेज सक्रिय नहीं
            </p>
            <p className="jd-ui" style={{ fontSize: 13, color: "#93a4c2", margin: 0, lineHeight: 1.5 }}>
              ब्रेकिंग या लाइव-वायर अपडेट आने पर यह स्क्रीन सक्रिय हो जाएगी। नीचे हाल की विकसित कहानियाँ हैं।
            </p>
          </div>
        ) : null}

        {lead ? (
          <>
            <div style={{ margin: "12px 14px 4px" }}>
              <ArticleImage
                src={lead.imageUrl}
                alt={lead.headline}
                ratio="lead"
                caption={isLiveActive ? "लाइव कवरेज" : undefined}
                priority
                sizes="(max-width: 640px) 100vw, 620px"
                tone="night"
              />
            </div>
            <div style={{ padding: "6px 14px 2px" }}>
              <h1
                className="jd-serif"
                style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "#e7edf6", lineHeight: 1.3 }}
              >
                {title}
              </h1>
            </div>
          </>
        ) : null}

        <div style={{ padding: "8px 14px" }}>
          {updates.length === 0 ? (
            <p className="jd-ui" style={{ color: "#93a4c2", fontSize: 14 }}>
              अपडेट उपलब्ध नहीं।
            </p>
          ) : (
            updates.map((s, i) => {
              const colors = ["#e05a63", "#c19a3e", "#93a4c2"];
              const color = colors[Math.min(i, colors.length - 1)];
              const time = hindiRelativeTime(s.publishedAt) || "अपडेट";
              return (
                <Link
                  key={s.slug}
                  href={storyHref(s.slug)}
                  style={{
                    display: "flex",
                    gap: 11,
                    paddingBottom: 14,
                    color: "inherit",
                    textDecoration: "none",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 9,
                        background: color,
                        marginTop: 3,
                      }}
                    />
                    {i < updates.length - 1 ? (
                      <div
                        style={{
                          width: 2,
                          flex: 1,
                          background: "rgba(150,175,215,0.16)",
                          marginTop: 3,
                          minHeight: 24,
                        }}
                      />
                    ) : null}
                  </div>
                  <div>
                    <div
                      className="jd-ui"
                      style={{ fontSize: 11, fontWeight: 800, color, marginBottom: 2 }}
                    >
                      {time}
                    </div>
                    <div
                      className="jd-serif"
                      style={{ fontSize: 15, lineHeight: 1.4, color: "#e7edf6" }}
                    >
                      {s.headline}
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </main>
    </ReaderShell>
  );
}
