"use client";

import dynamic from "next/dynamic";
import { BroadcastProvider, useBroadcast } from "./BroadcastContext";
import "./styles/studio.css";
import type { BroadcastLanguage, BroadcastSegment } from "./types";
import { JanDarpanStudio } from "./components/JanDarpanStudio";
import { InPlaceArticleReader } from "./components/InPlaceArticleReader";

const MobileInteractiveQueue = dynamic(
  () =>
    import("./components/MobileInteractiveQueue").then((m) => ({
      default: m.MobileInteractiveQueue,
    })),
  { ssr: false }
);

/**
 * Strict state model for Jan Darpan Live:
 *
 * DEFAULT STATE:
 *   HEADER
 *   + LIVE TV
 *   + CATEGORY FILTERS
 *   + NEWS QUEUE
 *
 * USER TAPS "पढ़ें":
 *   HEADER
 *   + STICKY LIVE TV
 *   + SELECTED ARTICLE
 *   + ARTICLE ACTION ICONS
 *   + RELATED ARTICLES
 *   (News queue disappears completely from reading area)
 *
 * USER TAPS BACK:
 *   HEADER
 *   + LIVE TV
 *   + CATEGORY FILTERS
 *   + NEWS QUEUE
 *   (Previous category and district state preserved)
 */
function LiveBroadcastLayout({ embedded }: { embedded?: boolean }) {
  const { state } = useBroadcast();
  const { selectedArticle } = state;

  return (
    <div className={`jdl-broadcast-wrapper ${selectedArticle ? "jdl-broadcast-wrapper--reading" : ""}`}>
      {/* Sticky Live TV Player — Persistent across all states */}
      <div className={`jdl-broadcast-tv-col ${selectedArticle ? "jdl-broadcast-tv-col--reading" : ""}`}>
        <JanDarpanStudio embedded={embedded} />
      </div>

      {/* State 1: When no article is open -> Render Category Filter Tabs & News Queue */}
      {!selectedArticle && (
        <div className="jdl-broadcast-queue-col">
          <MobileInteractiveQueue />
        </div>
      )}

      {/* State 2: When an article is selected -> Render Dedicated Article Reader (queue disappears) */}
      {selectedArticle && (
        <section
          id="jd-dedicated-article-reader"
          className="jdl-broadcast-reader-col"
          aria-label="Dedicated Article Reader"
        >
          <InPlaceArticleReader article={selectedArticle} />
        </section>
      )}
    </div>
  );
}

type Props = {
  initialLanguage?: BroadcastLanguage;
  initialQueue?: BroadcastSegment[];
  embedded?: boolean;
};

/**
 * Jan Darpan Live root entry point.
 */
export function JanDarpanLive({ initialLanguage = "hi", initialQueue, embedded = false }: Props) {
  return (
    <BroadcastProvider initialLanguage={initialLanguage} initialQueue={initialQueue}>
      <LiveBroadcastLayout embedded={embedded} />
    </BroadcastProvider>
  );
}

// Compact homepage preview card
export { JanDarpanLivePreview } from "./components/JanDarpanLivePreview";
