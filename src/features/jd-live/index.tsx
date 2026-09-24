"use client";

import dynamic from "next/dynamic";
import { BroadcastProvider } from "./BroadcastContext";
import "./styles/studio.css";
import type { BroadcastLanguage, BroadcastSegment } from "./types";
import { JanDarpanStudio } from "./components/JanDarpanStudio";

const MobileInteractiveQueue = dynamic(
  () =>
    import("./components/MobileInteractiveQueue").then((m) => ({
      default: m.MobileInteractiveQueue,
    })),
  { ssr: false }
);

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
      <JanDarpanStudio embedded={embedded} />
      <MobileInteractiveQueue />
    </BroadcastProvider>
  );
}

// Compact homepage preview card — loads no audio/video
export { JanDarpanLivePreview } from "./components/JanDarpanLivePreview";
