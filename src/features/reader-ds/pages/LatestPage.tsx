import type { HomeArticle } from "@/lib/homepage/types";
import { ChronoStory } from "../components/ChronoStory";
import { LatestRefreshBar } from "../components/LatestRefreshBar";
import { Masthead } from "../components/Masthead";
import { ReaderShell } from "../components/ReaderShell";
import { toReaderStory } from "../utils";

type Props = {
  articles: HomeArticle[];
};

/** A4 — ताज़ा ख़बरें (chronological) */
export function LatestPageView({ articles }: Props) {
  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
  const stories = sorted.map((a) => toReaderStory(a));

  return (
    <ReaderShell activeNav="latest">
      <Masthead pageTitle="ताज़ा" />
      <LatestRefreshBar />
      <main id="main-content" role="main" style={{ flex: 1, background: "var(--jd-paper)" }}>
        <div style={{ padding: "2px 14px" }}>
          {stories.length === 0 ? (
            <p className="jd-ui" style={{ padding: "16px 0", color: "var(--jd-muted)", fontSize: 14 }}>
              ताज़ा ख़बरें जल्द यहाँ दिखेंगी।
            </p>
          ) : (
            stories.map((s, i) => (
              <ChronoStory key={s.slug} story={s} last={i === stories.length - 1} />
            ))
          )}
        </div>
      </main>
    </ReaderShell>
  );
}
