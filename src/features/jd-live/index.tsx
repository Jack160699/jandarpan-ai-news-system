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

function LiveBroadcastLayout({ embedded }: { embedded?: boolean }) {
  const { state } = useBroadcast();
  const { selectedArticle } = state;

  return (
    <div className="jdl-broadcast-wrapper">
      <div className="jdl-broadcast-tv-col">
        <JanDarpanStudio embedded={embedded} />
      </div>
      <div className="jdl-broadcast-queue-col">
        <MobileInteractiveQueue />
      </div>
      {selectedArticle && (
        <section
          id="jd-inplace-article-reader"
          className="jdl-broadcast-article-col"
          aria-label="Selected article"
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
 * Direct rendering of JanDarpanStudio prevents nested chunk waterfalls.
 */
export function JanDarpanLive({ initialLanguage = "hi", initialQueue, embedded = false }: Props) {
  return (
    <BroadcastProvider initialLanguage={initialLanguage} initialQueue={initialQueue}>
      <LiveBroadcastLayout embedded={embedded} />
    </BroadcastProvider>
  );
}

// Compact homepage preview card — loads no audio/video
export { JanDarpanLivePreview } from "./components/JanDarpanLivePreview";
